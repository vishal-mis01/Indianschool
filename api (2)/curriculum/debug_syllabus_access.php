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

$user_id = $auth_user['id'];

try {
    // Get all syllabus data (admin view)
    $stmt = $pdo->prepare("
        SELECT DISTINCT
            cs.class_subject_id,
            c.class_name,
            s.subject_name,
            COUNT(*) as syllabus_entries
        FROM syllabus sy
        JOIN class_subjects cs ON sy.class_subject_id = cs.class_subject_id
        JOIN classes c ON cs.class_id = c.class_id
        JOIN subjects s ON cs.subject_id = s.subject_id
        GROUP BY cs.class_subject_id, c.class_name, s.subject_name
        ORDER BY c.class_name, s.subject_name
    ");
    $stmt->execute();
    $all_syllabus = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get user's assigned subjects
    $stmt = $pdo->prepare("
        SELECT
            cs.class_subject_id,
            c.class_name,
            s.subject_name
        FROM user_class_subjects ucs
        JOIN class_subjects cs ON ucs.class_subject_id = cs.class_subject_id
        JOIN classes c ON cs.class_id = c.class_id
        JOIN subjects s ON cs.subject_id = s.subject_id
        WHERE ucs.user_id = ?
        ORDER BY c.class_name, s.subject_name
    ");
    $stmt->execute([$user_id]);
    $user_subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Find syllabus data that user can't access
    $user_class_subject_ids = array_column($user_subjects, 'class_subject_id');
    $missing_subjects = array_filter($all_syllabus, function($item) use ($user_class_subject_ids) {
        return !in_array($item['class_subject_id'], $user_class_subject_ids);
    });

    echo json_encode([
        "user_id" => $user_id,
        "user_accessible_subjects" => $user_subjects,
        "all_subjects_with_syllabus" => $all_syllabus,
        "missing_subjects" => array_values($missing_subjects),
        "total_syllabus_subjects" => count($all_syllabus),
        "user_accessible_count" => count($user_subjects),
        "missing_count" => count($missing_subjects)
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}