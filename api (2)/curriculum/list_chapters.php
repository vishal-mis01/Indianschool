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

if (!$class_id || !$subject_id) {
    if (!$class_subject_id) {
        http_response_code(400);
        echo json_encode(["error" => "class_id and subject_id OR class_subject_id required"]);
        exit;
    }
}

try {
    $user_id = $auth_user['id'];
    
    error_log("list_chapters.php: user_id=$user_id, class_id=$class_id, subject_id=$subject_id, class_subject_id=$class_subject_id");
    
    if ($class_subject_id) {
        $stmt = $pdo->prepare("
            SELECT 
                s.chapter_no,
                s.chapter_name,
                CASE
                    WHEN s.section_type IS NULL OR TRIM(s.section_type) = '' THEN 'General'
                    ELSE TRIM(s.section_type)
                END as section_type,
                COUNT(DISTINCT CONCAT(s.topic, '_', s.sub_topic)) as total_subtopics,
                SUM(s.lec_required) as total_days
            FROM syllabus s
            WHERE s.class_subject_id = ?
            GROUP BY s.chapter_no, s.chapter_name, CASE
                    WHEN s.section_type IS NULL OR TRIM(s.section_type) = '' THEN 'General'
                    ELSE TRIM(s.section_type)
                END
        ");
        $stmt->execute([$class_subject_id]);
    } else {
        $stmt = $pdo->prepare("
            SELECT 
                s.chapter_no,
                s.chapter_name,
                CASE
                    WHEN s.section_type IS NULL OR TRIM(s.section_type) = '' THEN 'General'
                    ELSE TRIM(s.section_type)
                END as section_type,
                COUNT(DISTINCT CONCAT(s.topic, '_', s.sub_topic)) as total_subtopics,
                SUM(s.lec_required) as total_days
            FROM syllabus s
            JOIN class_subjects cs ON s.class_subject_id = cs.class_subject_id
            WHERE cs.class_id = ? AND cs.subject_id = ?
            GROUP BY s.chapter_no, s.chapter_name, CASE
                    WHEN s.section_type IS NULL OR TRIM(s.section_type) = '' THEN 'General'
                    ELSE TRIM(s.section_type)
                END
        ");
        $stmt->execute([$class_id, $subject_id]);
    }
    $chapters = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("list_chapters.php: Found " . count($chapters) . " chapters for class_id=$class_id, subject_id=$subject_id");
    if (count($chapters) > 0) {
        error_log("First chapter: " . json_encode($chapters[0]));
        error_log("Section types found: " . json_encode(array_unique(array_column($chapters, 'section_type'))));
    } else {
        error_log("WARNING: No chapters found! Checking if syllabus data exists...");
        $check = $pdo->prepare("SELECT COUNT(*) as cnt FROM syllabus s JOIN class_subjects cs ON s.class_subject_id = cs.class_subject_id WHERE cs.class_id = ? AND cs.subject_id = ?");
        $check->execute([$class_id, $subject_id]);
        $result = $check->fetch(PDO::FETCH_ASSOC);
        error_log("Total syllabus entries for this subject: " . $result['cnt']);
    }
    
    echo json_encode($chapters);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}