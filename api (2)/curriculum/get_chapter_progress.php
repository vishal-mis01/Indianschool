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
$fetch_all = isset($_GET['fetch_all']) && $_GET['fetch_all'] === '1';

if ((!$class_subject_id && (!$class_id || !$subject_id))) {
    http_response_code(400);
    echo json_encode(["error" => "class_subject_id or class_id+subject_id required"]);
    exit;
}

if (!$fetch_all && $chapter_no === null) {
    http_response_code(400);
    echo json_encode(["error" => "chapter_no required or set fetch_all=1 to get entire subject"]);
    exit;
}

try {
    $user_id = $auth_user['id'];

    error_log("get_chapter_progress.php: user_id=$user_id, class_id=$class_id, subject_id=$subject_id, class_subject_id=$class_subject_id, chapter_no=$chapter_no, fetch_all=$fetch_all");

    // Get chapter info with syllabus and user progress data
    // If fetch_all=1, get ALL chapters; otherwise get specific chapter
    if ($class_subject_id) {
        if ($fetch_all) {
            // Fetch entire subject curriculum
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
                WHERE s.class_subject_id = ?
                ORDER BY s.sequence_order
            ");
            $stmt->execute([$user_id, $class_subject_id]);
        } else {
            // Fetch specific chapter
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
        }
    } else {
        if ($fetch_all) {
            // Fetch entire subject curriculum
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
                WHERE cs.class_id = ? AND cs.subject_id = ?
                ORDER BY s.sequence_order
            ");
            $stmt->execute([$user_id, $class_id, $subject_id]);
        } else {
            // Fetch specific chapter
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

    if ($fetch_all) {
        // Fetch entire subject - group by chapter
        $chapters_by_number = [];
        
        foreach ($rows as $row) {
            if (empty(trim($row['topic'])) || empty(trim($row['sub_topic']))) {
                continue;
            }
            
            $chapter_no = $row['chapter_no'];
            if (!isset($chapters_by_number[$chapter_no])) {
                $chapters_by_number[$chapter_no] = [
                    'chapter_no' => $chapter_no,
                    'chapter_name' => $row['chapter_name'] ?: "Chapter $chapter_no",
                    'sections' => []
                ];
            }
            
            $section_type = $row['section_type'] ?: 'General';
            if (!isset($chapters_by_number[$chapter_no]['sections'][$section_type])) {
                $chapters_by_number[$chapter_no]['sections'][$section_type] = [
                    'section_type' => $section_type,
                    'topics' => []
                ];
            }
            
            $topic = $row['topic'];
            $topicIndex = -1;
            foreach ($chapters_by_number[$chapter_no]['sections'][$section_type]['topics'] as $i => $t) {
                if ($t['topic_name'] === $topic) {
                    $topicIndex = $i;
                    break;
                }
            }
            
            if ($topicIndex === -1) {
                $chapters_by_number[$chapter_no]['sections'][$section_type]['topics'][] = [
                    'topic_name' => $topic,
                    'subtopics' => []
                ];
                $topicIndex = count($chapters_by_number[$chapter_no]['sections'][$section_type]['topics']) - 1;
            }
            
            $chapters_by_number[$chapter_no]['sections'][$section_type]['topics'][$topicIndex]['subtopics'][] = [
                'sub_topic' => $row['sub_topic'],
                'activity' => $row['activity'] ?? null,
                'lec_required' => (float)$row['lec_required'],
                'sequence_order' => (int)$row['sequence_order'],
                'planned_date' => $row['planned_date'] ? date('j M Y', strtotime($row['planned_date'])) : null,
                'completed_date' => $row['completed_date'] ? date('j M Y', strtotime($row['completed_date'])) : null,
                'status' => $row['status'] ?? 'not_assigned'
            ];
        }
        
        // Sort the structure by sequence_order
        foreach ($chapters_by_number as &$chapter) {
            foreach ($chapter['sections'] as &$section) {
                foreach ($section['topics'] as &$topic) {
                    usort($topic['subtopics'], function($a, $b) {
                        return $a['sequence_order'] <=> $b['sequence_order'];
                    });
                }
                // Sort topics in section by min sequence_order
                usort($section['topics'], function($a, $b) {
                    $a_seq = array_column($a['subtopics'], 'sequence_order');
                    $a_min = $a_seq ? min($a_seq) : PHP_INT_MAX;
                    $b_seq = array_column($b['subtopics'], 'sequence_order');
                    $b_min = $b_seq ? min($b_seq) : PHP_INT_MAX;
                    return $a_min <=> $b_min;
                });
            }
            // Sort sections in chapter by min sequence_order
            uasort($chapter['sections'], function($a, $b) {
                $a_mins = array_map(function($topic) {
                    $seq = array_column($topic['subtopics'], 'sequence_order');
                    return $seq ? min($seq) : PHP_INT_MAX;
                }, $a['topics']);
                $a_min = $a_mins ? min($a_mins) : PHP_INT_MAX;
                $b_mins = array_map(function($topic) {
                    $seq = array_column($topic['subtopics'], 'sequence_order');
                    return $seq ? min($seq) : PHP_INT_MAX;
                }, $b['topics']);
                $b_min = $b_mins ? min($b_mins) : PHP_INT_MAX;
                return $a_min <=> $b_min;
            });
        }
        // Sort chapters by min sequence_order
        uasort($chapters_by_number, function($a, $b) {
            $a_mins = array_map(function($section) {
                $section_mins = array_map(function($topic) {
                    $seq = array_column($topic['subtopics'], 'sequence_order');
                    return $seq ? min($seq) : PHP_INT_MAX;
                }, $section['topics']);
                return $section_mins ? min($section_mins) : PHP_INT_MAX;
            }, $a['sections']);
            $a_min = $a_mins ? min($a_mins) : PHP_INT_MAX;
            $b_mins = array_map(function($section) {
                $section_mins = array_map(function($topic) {
                    $seq = array_column($topic['subtopics'], 'sequence_order');
                    return $seq ? min($seq) : PHP_INT_MAX;
                }, $section['topics']);
                return $section_mins ? min($section_mins) : PHP_INT_MAX;
            }, $b['sections']);
            $b_min = $b_mins ? min($b_mins) : PHP_INT_MAX;
            return $a_min <=> $b_min;
        });
        
        // Convert sections from associative to indexed array
        foreach ($chapters_by_number as &$ch) {
            $ch['sections'] = array_values($ch['sections']);
        }
        
        echo json_encode([
            'fetch_all' => true,
            'chapters' => array_values($chapters_by_number)
        ]);
    } else {
        // Fetch single chapter (original logic)
        $chapter_info = [
            'chapter_no' => $rows[0]['chapter_no'],
            'chapter_name' => $rows[0]['chapter_name'],
            'class_subject_id' => $rows[0]['class_subject_id']
        ];

        $sections = [];
        foreach ($rows as $row) {
            if (empty(trim($row['topic'])) || empty(trim($row['sub_topic']))) {
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
            $topicIndex = -1;
            foreach ($sections[$section_type]['topics'] as $i => $t) {
                if ($t['topic_name'] === $topic) {
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
                'lec_required' => (float)$row['lec_required'],
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
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
