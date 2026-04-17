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
$section_type = trim($_GET['section_type'] ?? '');

$section_filter = '';
$section_params = [];
if ($section_type !== '') {
    if (strtolower($section_type) === 'general') {
        $section_filter = " AND (s.section_type IS NULL OR TRIM(s.section_type) = '')";
    } else {
        $section_filter = " AND TRIM(s.section_type) = ?";
        $section_params[] = $section_type;
    }
}

if (!$class_id || !$subject_id) {
    if (!$class_subject_id) {
        http_response_code(400);
        echo json_encode(["error" => "class_id and subject_id OR class_subject_id required"]);
        exit;
    }
}

try {
    $user_id = $auth_user['id'];

    error_log("list_chapters_by_section.php: user_id=$user_id, class_id=$class_id, subject_id=$subject_id, class_subject_id=$class_subject_id, section_type=$section_type");

    // Return chapters for this class-subject and optional section filter
    // Use class_subject_id if provided, otherwise join on class_id + subject_id
    if ($class_subject_id) {
        $stmt = $pdo->prepare("
            SELECT DISTINCT
                s.chapter_no,
                s.chapter_name,
                COUNT(DISTINCT CONCAT(s.topic, '_', s.sub_topic)) as total_subtopics,
                SUM(s.lec_required) as total_days
            FROM syllabus s
            WHERE s.class_subject_id = ?" . $section_filter . "
            GROUP BY s.chapter_no, s.chapter_name
            ORDER BY s.chapter_no ASC
        ");

        $params = array_merge([$class_subject_id], $section_params);
        $stmt->execute($params);
    } else {
        $stmt = $pdo->prepare("
            SELECT DISTINCT
                s.chapter_no,
                s.chapter_name,
                COUNT(DISTINCT CONCAT(s.topic, '_', s.sub_topic)) as total_subtopics,
                SUM(s.lec_required) as total_days
            FROM syllabus s
            JOIN class_subjects cs ON s.class_subject_id = cs.class_subject_id
            WHERE cs.class_id = ?
            AND cs.subject_id = ?" . $section_filter . "
            GROUP BY s.chapter_no, s.chapter_name
            ORDER BY s.chapter_no ASC
        ");

        $params = array_merge([$class_id, $subject_id], $section_params);
        $stmt->execute($params);
    }
    $chapters = $stmt->fetchAll(PDO::FETCH_ASSOC);

    error_log("list_chapters_by_section.php: Found " . count($chapters) . " chapters for section_type=$section_type");

    // DEBUG: Check if ANY syllabus data exists for this class-subject
    if (count($chapters) === 0) {
        error_log("DEBUG: No chapters found. Checking if syllabus data exists...");
        $debugStmt = $pdo->prepare("
            SELECT COUNT(*) as total_rows
            FROM syllabus s
            JOIN class_subjects cs ON s.class_subject_id = cs.class_subject_id
            WHERE cs.class_id = ? AND cs.subject_id = ?
        ");
        $debugStmt->execute([$class_id, $subject_id]);
        $debugResult = $debugStmt->fetch(PDO::FETCH_ASSOC);
        error_log("Total syllabus rows for class_id=$class_id, subject_id=$subject_id: " . $debugResult['total_rows']);

        // Show all section_types available
        $sectionStmt = $pdo->prepare("
            SELECT DISTINCT COALESCE(s.section_type, 'NULL') as section_type, COUNT(*) as count
            FROM syllabus s
            JOIN class_subjects cs ON s.class_subject_id = cs.class_subject_id
            WHERE cs.class_id = ? AND cs.subject_id = ?
            GROUP BY COALESCE(s.section_type, 'NULL')
        ");
        $sectionStmt->execute([$class_id, $subject_id]);
        $sectionTypes = $sectionStmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("Section types available: " . json_encode($sectionTypes));
    }

    echo json_encode($chapters);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}