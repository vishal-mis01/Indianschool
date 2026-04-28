<?php
require_once __DIR__ . '/_cors.php';
require "config.php";
require "auth.php";

header("Content-Type: application/json");

try {
    // Get lessons taught on a specific date by retrieving chapter completion records
    $selected_date = $_GET['date'] ?? date("Y-m-d");
    
    // Match syllabus metadata with user progress, then return today's scheduled lessons.
    // Pending vs completed is derived from user_syllabus_progress status/completed_date.
    $sql = "
    SELECT
        usp.user_id AS user_id,
        u.name AS user_name,
        c.class_name AS class_name,
        sub.subject_name AS subject_name,
        usp.chapter_no,
        COALESCE(sy.chapter_name, '') AS chapter_name,
        usp.topic,
        usp.sub_topic,
        usp.planned_date,
        usp.completed_date,
        CASE
            WHEN LOWER(TRIM(usp.status)) = 'completed'
                OR (usp.completed_date IS NOT NULL AND usp.completed_date != '' AND usp.completed_date != '0000-00-00' AND usp.completed_date != '0000-00-00 00:00:00')
            THEN 'completed'
            ELSE 'pending'
        END AS status,
        sy.activity
    FROM user_syllabus_progress usp
    JOIN class_subjects cs ON cs.class_subject_id = usp.class_subject_id
    JOIN classes c ON c.class_id = cs.class_id
    JOIN subjects sub ON sub.subject_id = cs.subject_id
    LEFT JOIN syllabus sy ON sy.class_subject_id = usp.class_subject_id 
        AND sy.chapter_no = usp.chapter_no 
        AND sy.topic = usp.topic 
        AND sy.sub_topic = usp.sub_topic
    JOIN users u ON u.id = usp.user_id
    WHERE (usp.planned_date IS NOT NULL AND DATE(usp.planned_date) = ?)
    ORDER BY c.class_name, sub.subject_name, usp.chapter_no, usp.topic, usp.sub_topic
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$selected_date]);
    $lessons = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the response
    $data = [];
    foreach ($lessons as $lesson) {
        $plannedDate = null;
        if (!empty($lesson['planned_date']) && $lesson['planned_date'] !== '0000-00-00' && $lesson['planned_date'] !== '0000-00-00 00:00:00') {
            try {
                $plannedDate = (new DateTime($lesson['planned_date']))->format('Y-m-d');
            } catch (Exception $e) {
                $plannedDate = $lesson['planned_date'];
            }
        }

        $completedDate = null;
        if (!empty($lesson['completed_date']) && $lesson['completed_date'] !== '0000-00-00' && $lesson['completed_date'] !== '0000-00-00 00:00:00') {
            try {
                $completedDate = (new DateTime($lesson['completed_date']))->format('Y-m-d');
            } catch (Exception $e) {
                $completedDate = $lesson['completed_date'];
            }
        }

        $data[] = [
            'user_id' => $lesson['user_id'],
            'user_name' => $lesson['user_name'],
            'class_name' => $lesson['class_name'],
            'subject_name' => $lesson['subject_name'],
            'chapter_no' => $lesson['chapter_no'],
            'chapter_name' => $lesson['chapter_name'],
            'topic' => $lesson['topic'],
            'sub_topic' => $lesson['sub_topic'],
            'activity' => $lesson['activity'],
            'planned_date' => $plannedDate,
            'completed_date' => $completedDate,
            'status' => $lesson['status'] ?? 'not_assigned',
        ];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $data,
        'count' => count($data),
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
?>
