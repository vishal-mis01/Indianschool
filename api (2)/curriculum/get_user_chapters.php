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

try {
    $user_id = $auth_user['id'];

    error_log("get_user_chapters.php: Starting for user_id=$user_id");

    // Get all chapters assigned to user with progress and subject info
    $stmt = $pdo->prepare("
        SELECT 
            usp_grouped.progress_id,
            usp_grouped.class_subject_id,
            cs.subject_id,
            cs.class_id,
            subj.subject_name,
            cls.class_name,
            usp_grouped.chapter_no,
            usp_grouped.chapter_name,
            usp_grouped.total_subtopics,
            usp_grouped.completed_subtopics,
            usp_grouped.planned_date,
            usp_grouped.due_date,
            usp_grouped.assigned_date
        FROM (
            SELECT 
                MIN(usp.id) AS progress_id,
                usp.class_subject_id,
                usp.chapter_no,
                COALESCE(NULLIF(MAX(s.chapter_name), ''), 'Grammar Section') AS chapter_name,
                COUNT(*) AS total_subtopics,
                SUM(CASE WHEN usp.status = 'completed' THEN 1 ELSE 0 END) AS completed_subtopics,
                MIN(usp.planned_date) AS planned_date,
                MAX(usp.planned_date) AS due_date,
                MAX(usp.created_at) AS assigned_date
            FROM user_syllabus_progress usp
            LEFT JOIN syllabus s ON s.class_subject_id = usp.class_subject_id 
                AND s.chapter_no = usp.chapter_no
                AND s.topic = usp.topic
                AND s.sub_topic = usp.sub_topic
            WHERE usp.user_id = ?
            GROUP BY usp.class_subject_id, usp.chapter_no
        ) usp_grouped
        JOIN class_subjects cs ON cs.class_subject_id = usp_grouped.class_subject_id
        JOIN subjects subj ON subj.subject_id = cs.subject_id
        JOIN classes cls ON cls.class_id = cs.class_id
        ORDER BY usp_grouped.assigned_date DESC
    ");
    $stmt->execute([$user_id]);
    $chapters = $stmt->fetchAll(PDO::FETCH_ASSOC);

    error_log("get_user_chapters.php: Found " . count($chapters) . " chapters for user_id=$user_id");
    if (count($chapters) > 0) {
        error_log("First chapter: " . json_encode($chapters[0]));
    }

    // Convert numeric strings to integers and format dates
    foreach ($chapters as &$ch) {
        $ch['class_subject_id'] = (int)$ch['class_subject_id'];
        $ch['subject_id'] = (int)$ch['subject_id'];
        $ch['class_id'] = (int)$ch['class_id'];
        $ch['chapter_no'] = (int)$ch['chapter_no'];
        $ch['total_subtopics'] = (int)$ch['total_subtopics'];
        $ch['completed_subtopics'] = (int)$ch['completed_subtopics'];
        $ch['planned_date'] = $ch['planned_date'] ? date('j M Y', strtotime($ch['planned_date'])) : null;
        $ch['due_date'] = $ch['due_date'] ? date('j M Y', strtotime($ch['due_date'])) : null;
        $ch['assigned_date'] = $ch['assigned_date'] ? date('j M Y', strtotime($ch['assigned_date'])) : null;

        if (!$ch['chapter_name'] || trim($ch['chapter_name']) === '') {
            $ch['chapter_name'] = $ch['chapter_no'] === 0 ? 'Grammar Section' : "Chapter {$ch['chapter_no']}";
        }
    }

    echo json_encode($chapters);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
