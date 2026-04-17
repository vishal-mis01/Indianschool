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

$class_id = (int)($_GET['class_id'] ?? 0);
$subject_id = (int)($_GET['subject_id'] ?? 0);
$class_subject_id = (int)($_GET['class_subject_id'] ?? 0);
$chapter_no = isset($_GET['chapter_no']) ? (int)$_GET['chapter_no'] : null;

if ((!$class_subject_id && (!$class_id || !$subject_id)) || $chapter_no === null) {
    http_response_code(400);
    echo json_encode(["error" => "class_subject_id or class_id+subject_id, and chapter_no required"]);
    exit;
}

try {
    $user_id = $auth_user['id'];

    error_log("get_chapter_progress.php: user_id=$user_id, class_id=$class_id, subject_id=$subject_id, class_subject_id=$class_subject_id, chapter_no=$chapter_no");

    // Get chapter info with syllabus and user progress data
    // Include both regular chapter content and grammar sections
    if ($class_subject_id) {
        $stmt = $pdo->prepare("
            SELECT
                s.chapter_no,
                s.chapter_name,
                s.topic,
                s.sub_topic,
                COALESCE(s.activity, '') AS activity,
                s.lec_required,
                s.sequence_order,
                s.section_type,
                s.class_subject_id,
                usp.planned_date,
                usp.completed_date,
                usp.status
            FROM syllabus s
            LEFT JOIN user_syllabus_progress usp ON (
                usp.user_id = ?
                AND usp.class_subject_id = s.class_subject_id
                AND usp.chapter_no = s.chapter_no
                AND usp.topic = s.topic
                AND usp.sub_topic = s.sub_topic
            )
            WHERE s.class_subject_id = ? AND (
                s.chapter_no = ? OR 
                s.chapter_no = 0 OR 
                LOWER(TRIM(s.section_type)) = 'grammar'
            )
            ORDER BY s.sequence_order
        ");
        $stmt->execute([$user_id, $class_subject_id, $chapter_no]);
    } else {
        $stmt = $pdo->prepare("
            SELECT
                s.chapter_no,
                s.chapter_name,
                s.topic,
                s.sub_topic,
                COALESCE(s.activity, '') AS activity,
                s.lec_required,
                s.sequence_order,
                s.section_type,
                cs.class_subject_id,
                usp.planned_date,
                usp.completed_date,
                usp.status
            FROM syllabus s
            JOIN class_subjects cs ON s.class_subject_id = cs.class_subject_id
            LEFT JOIN user_syllabus_progress usp ON (
                usp.user_id = ?
                AND usp.class_subject_id = s.class_subject_id
                AND usp.chapter_no = s.chapter_no
                AND usp.topic = s.topic
                AND usp.sub_topic = s.sub_topic
            )
            WHERE cs.class_id = ? AND cs.subject_id = ? AND (
                s.chapter_no = ? OR 
                s.chapter_no = 0 OR 
                LOWER(TRIM(s.section_type)) = 'grammar'
            )
            ORDER BY s.sequence_order
        ");
        $stmt->execute([$user_id, $class_id, $subject_id, $chapter_no]);
    }
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    error_log("get_chapter_progress.php: Found " . count($rows) . " rows for class_id=$class_id, subject_id=$subject_id, chapter_no=$chapter_no");
    if (count($rows) > 0) {
        error_log("First row: " . json_encode($rows[0]));
        // Log all topics
        $topics_list = array_unique(array_column($rows, 'topic'));
        error_log("Topics: " . implode(', ', $topics_list));
    }

    if (empty($rows)) {
        http_response_code(404);
        echo json_encode(["error" => "Chapter not found"]);
        exit;
    }

    // Group by section_type, then by topic
    $chapter_info = [
        'chapter_no' => $rows[0]['chapter_no'],
        'chapter_name' => $rows[0]['chapter_name'],
        'class_subject_id' => $rows[0]['class_subject_id']
    ];

    $sections = [];
    foreach ($rows as $row) {
        // Skip rows with empty topic or sub_topic
        if (empty(trim($row['topic'])) || empty(trim($row['sub_topic']))) {
            error_log("Skipping row with empty topic or sub_topic: " . json_encode($row));
            continue;
        }

        $section_type = $row['section_type'] ?: 'General';
        if (!isset($sections[$section_type])) {
            $sections[$section_type] = [
                'section_type' => $section_type,
                'topics' => []
            ];
        }

        $topic = $row['topic'];
        // Find existing topic or create new one
        $topicIndex = -1;
        foreach ($sections[$section_type]['topics'] as $i => $existingTopic) {
            if ($existingTopic['topic_name'] === $topic) {
                $topicIndex = $i;
                break;
            }
        }

        if ($topicIndex === -1) {
            $sections[$section_type]['topics'][] = [
                'topic_name' => $topic,
                'subtopics' => []
            ];
            $topicIndex = count($sections[$section_type]['topics']) - 1;
        }

        $sections[$section_type]['topics'][$topicIndex]['subtopics'][] = [
            'sub_topic' => $row['sub_topic'],
            'activity' => $row['activity'] ?? null,
            'lec_required' => (float)$row['lec_required'], // Keep as float, don't cast to int
            'sequence_order' => (int)$row['sequence_order'],
            'planned_date' => $row['planned_date'] ? date('j M Y', strtotime($row['planned_date'])) : null,
            'completed_date' => $row['completed_date'] ? date('j M Y', strtotime($row['completed_date'])) : null,
            'status' => $row['status'] ?? 'not_assigned'
        ];
    }

    if (empty($sections)) {
        http_response_code(404);
        echo json_encode(["error" => "No valid subtopics found for this chapter"]);
        exit;
    }

    echo json_encode([
        'chapter' => $chapter_info,
        'sections' => array_values($sections)
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
