<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

if (!isset($auth_user)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$class_subject_id = (int)($data['class_subject_id'] ?? 0);
$chapter_no = (int)($data['chapter_no'] ?? 0);
$section_type = trim($data['section_type'] ?? '');
$start_date = trim($data['start_date'] ?? date('Y-m-d'));

if (!$class_subject_id || !$chapter_no) {
    http_response_code(400);
    echo json_encode(["error" => "class_subject_id and chapter_no required"]);
    exit;
}

try {
    $pdo->beginTransaction();

    $user_id = $auth_user['id'];
    error_log("assign_chapter.php: user_id=$user_id, class_subject_id=$class_subject_id, chapter_no=$chapter_no, start_date=$start_date");

    // Get all subtopics for this chapter from syllabus
    $query = "
        SELECT 
            chapter_no,
            chapter_name,
            section_type,
            topic,
            sub_topic,
            lec_required,
            sequence_order
        FROM syllabus
        WHERE class_subject_id = ? AND chapter_no = ?
    ";
    $params = [$class_subject_id, $chapter_no];
    
    // If section_type is provided, filter by it
    if (!empty($section_type)) {
        $query .= " AND (section_type = ? OR section_type IS NULL OR section_type = '')";
        $params[] = $section_type;
    }
    
    $query .= " ORDER BY sequence_order";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $syllabus_rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    error_log("Found " . count($syllabus_rows) . " subtopics in chapter");

    if (empty($syllabus_rows)) {
        http_response_code(404);
        echo json_encode(["error" => "Chapter not found in syllabus"]);
        exit;
    }

    // Check if there's a grammar section and assign it automatically
    $grammar_query = "
        SELECT 
            chapter_no,
            chapter_name,
            section_type,
            topic,
            sub_topic,
            lec_required,
            sequence_order
        FROM syllabus
        WHERE class_subject_id = ? AND (
            chapter_no = 0 OR 
            chapter_no IS NULL OR 
            LOWER(TRIM(section_type)) = 'grammar'
        )
        ORDER BY sequence_order
    ";
    $grammar_stmt = $pdo->prepare($grammar_query);
    $grammar_stmt->execute([$class_subject_id]);
    $grammar_rows = $grammar_stmt->fetchAll(PDO::FETCH_ASSOC);
    error_log("Found " . count($grammar_rows) . " grammar subtopics");

    // Combine chapter and grammar rows
    $all_syllabus_rows = array_merge($syllabus_rows, $grammar_rows);

    // Filter out rows with empty topic or sub_topic
    $all_syllabus_rows = array_filter($all_syllabus_rows, function($row) {
        return !empty(trim($row['topic'] ?? '')) && !empty(trim($row['sub_topic'] ?? ''));
    });

    error_log("After filtering empty topics/subtopics: " . count($all_syllabus_rows) . " rows remaining");

    // Check if chapter is already assigned to this user
    // For now, allow multiple assignments of same chapter_no from different sections
    // TODO: Add section_type to user_syllabus_progress table for proper checking
    $checkAssigned = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM user_syllabus_progress
        WHERE user_id = ? AND class_subject_id = ? AND chapter_no = ?
        LIMIT 1
    ");
    $checkAssigned->execute([$user_id, $class_subject_id, $chapter_no]);
    $assignedCount = $checkAssigned->fetch(PDO::FETCH_ASSOC);

    if ($assignedCount['count'] > 0) {
        // For now, allow re-assignment - the ON DUPLICATE KEY will handle updates
        error_log("Chapter $chapter_no already assigned, allowing re-assignment with section filter");
    }

    // Get holiday dates from database
    $holiday_stmt = $pdo->prepare("SELECT holiday_date FROM holidays");
    $holiday_stmt->execute();
    $holidays = $holiday_stmt->fetchAll(PDO::FETCH_COLUMN, 0);
    $holiday_dates = array_map(function($date) {
        return (new DateTime($date))->format('Y-m-d');
    }, $holidays);
    
    // Helper function to move to next valid date (not Sunday, not holiday)
    $getNextValidDate = function($current_date) use ($holiday_dates) {
        $next_date = clone $current_date;
        while (true) {
            $day_of_week = (int)$next_date->format('w'); // 0 = Sunday, 1-6 = Mon-Sat
            $date_str = $next_date->format('Y-m-d');
            
            // If not Sunday and not a holiday, return it
            if ($day_of_week != 0 && !in_array($date_str, $holiday_dates)) {
                return $next_date;
            }
            
            // Move to next day
            $next_date->modify('+1 day');
        }
    };

    // Create planned dates for each subtopic
    $current_date = new DateTime($start_date);
    $current_date = $getNextValidDate($current_date); // Start on a valid date
    
    $insert_stmt = $pdo->prepare("
        INSERT INTO user_syllabus_progress 
        (user_id, class_subject_id, chapter_no, topic, sub_topic, lec_required, planned_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        ON DUPLICATE KEY UPDATE
            planned_date = VALUES(planned_date),
            status = 'pending',
            updated_at = NOW()
    ");

    $inserted_count = 0;
    $updated_count = 0;
    $duplicate_count = 0;
    
    // Separate chapter and grammar rows for different date calculation logic
    $chapter_rows = array_filter($all_syllabus_rows, function($row) {
        return isset($row['chapter_no']) &&
               $row['chapter_no'] !== 0 &&
               $row['chapter_no'] !== null &&
               strtolower(trim($row['section_type'] ?? '')) !== 'grammar';
    });
    $grammar_rows = array_filter($all_syllabus_rows, function($row) {
        return !isset($row['chapter_no']) ||
               $row['chapter_no'] == 0 ||
               $row['chapter_no'] === null ||
               strtolower(trim($row['section_type'] ?? '')) == 'grammar';
    });
    
    error_log("Chapter rows: " . count($chapter_rows) . ", Grammar rows: " . count($grammar_rows));
    
    // First, assign chapter rows with incremental dates
    foreach ($chapter_rows as $row) {
        try {
            $result = $insert_stmt->execute([
                $user_id,
                $class_subject_id,
                $chapter_no,
                $row['topic'],
                $row['sub_topic'],
                $row['lec_required'],
                $current_date->format('Y-m-d')
            ]);
            if ($result) {
                // Check if it was an insert or update
                if ($insert_stmt->rowCount() == 1) {
                    $inserted_count++;
                } else if ($insert_stmt->rowCount() == 2) {
                    $updated_count++;
                }
            }
            error_log("Inserted/updated chapter: " . $row['topic'] . " / " . $row['sub_topic'] . " on " . $current_date->format('Y-m-d'));
        } catch (PDOException $e) {
            // Handle duplicate key - just count it
            if (strpos($e->getMessage(), '1062') !== false) {
                $duplicate_count++;
                error_log("Already assigned chapter: " . $row['topic'] . " / " . $row['sub_topic']);
            } else {
                throw $e; // Re-throw if it's a different error
            }
        }
        
        // Increment date by lec_required days, skipping Sundays and holidays
        // Handle fractional lecture times by rounding up to ensure minimum 1 day allocation
        $lec_required = (float)$row['lec_required'];
        $days_to_add = ceil($lec_required); // Round up to ensure at least 1 day for fractional lectures

        for ($i = 0; $i < $days_to_add; $i++) {
            $current_date->modify('+1 day');
            $current_date = $getNextValidDate($current_date);
        }
    }
    
    // Now assign grammar rows with the same date (after chapter completion)
    if (!empty($grammar_rows)) {
        // All grammar subtopics get the same planned date: after the last chapter subtopic
        $grammar_date = clone $current_date;
        error_log("All grammar subtopics scheduled for: " . $grammar_date->format('Y-m-d'));

        // Assign all grammar subtopics with the same date
        foreach ($grammar_rows as $row) {
            try {
                // Use chapter_no = 0 for grammar sections
                $grammar_chapter_no = 0;

                $result = $insert_stmt->execute([
                    $user_id,
                    $class_subject_id,
                    $grammar_chapter_no,
                    $row['topic'],
                    $row['sub_topic'],
                    $row['lec_required'],
                    $grammar_date->format('Y-m-d')
                ]);
                if ($result) {
                    // Check if it was an insert or update
                    if ($insert_stmt->rowCount() == 1) {
                        $inserted_count++;
                    } else if ($insert_stmt->rowCount() == 2) {
                        $updated_count++;
                    }
                }
                error_log("Inserted/updated grammar: " . $row['topic'] . " / " . $row['sub_topic'] . " on " . $grammar_date->format('Y-m-d'));
            } catch (PDOException $e) {
                // Handle duplicate key - just count it
                if (strpos($e->getMessage(), '1062') !== false) {
                    $duplicate_count++;
                    error_log("Already assigned grammar: " . $row['topic'] . " / " . $row['sub_topic']);
                } else {
                    throw $e; // Re-throw if it's a different error
                }
            }

            // Note: All grammar subtopics get the same date, no increment needed
        }
    }
    
    error_log("Total inserts: $inserted_count, updates: $updated_count, already assigned: $duplicate_count");

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "Chapter and grammar assignment processed",
        "chapter_subtopics" => count($chapter_rows),
        "grammar_subtopics" => count($grammar_rows),
        "rows_affected" => $inserted_count + $updated_count,
        "already_assigned" => $duplicate_count
    ]);
} catch (Exception $e) {
    error_log("assign_chapter.php error: " . $e->getMessage());
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
