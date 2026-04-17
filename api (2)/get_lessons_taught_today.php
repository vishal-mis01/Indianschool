<?php
require "config.php";
require "auth.php";

header("Content-Type: application/json");

try {
    // Get lessons taught today by retrieving chapter completion records
    $today = date("Y-m-d");
    
    // Query for subtopics assigned for today and their completion status
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
        usp.status,
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
    WHERE DATE(usp.planned_date) = CURDATE()
    ORDER BY c.class_name, sub.subject_name, usp.chapter_no, usp.topic, usp.sub_topic
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $lessons = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the response
    $data = [];
    foreach ($lessons as $lesson) {
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
            'planned_date' => $lesson['planned_date'] ? date('Y-m-d', strtotime($lesson['planned_date'])) : null,
            'completed_date' => $lesson['completed_date'] ? date('Y-m-d', strtotime($lesson['completed_date'])) : null,
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
