<?php
require "config.php";
require "auth.php";
require "_cors.php";

header("Content-Type: application/json");

try {
    // Match syllabus metadata with user progress and return only active pending lesson plans.
    // Status is derived from user_syllabus_progress; syllabus provides chapter details and activity.
    $sql = "
    SELECT
        usp.user_id AS user_id,
        usp.class_subject_id AS class_subject_id,
        u.name AS user_name,
        c.class_name AS class_name,
        sub.subject_name AS subject_name,
        usp.chapter_no,
        COALESCE(sy.chapter_name, '') AS chapter_name,
        usp.topic,
        usp.sub_topic,
        usp.planned_date,
        usp.completed_date,
        COALESCE(NULLIF(LOWER(TRIM(usp.status)), ''), 'pending') AS status,
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
    WHERE usp.planned_date IS NOT NULL
      AND (
        COALESCE(LOWER(TRIM(usp.status)), '') = ''
        OR LOWER(TRIM(usp.status)) = 'pending'
      )
      AND (
        usp.completed_date IS NULL
        OR TRIM(COALESCE(usp.completed_date, '')) = ''
        OR usp.completed_date = '0000-00-00'
        OR usp.completed_date = '0000-00-00 00:00:00'
      )
    ORDER BY usp.planned_date ASC, c.class_name, sub.subject_name, usp.chapter_no, usp.topic, usp.sub_topic
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
            'status' => $lesson['status'] ?? 'pending',
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