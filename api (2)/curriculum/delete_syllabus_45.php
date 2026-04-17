<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

try {
    // Delete all syllabus records for class_subject_id = 45
    $stmt = $pdo->prepare("DELETE FROM syllabus WHERE class_subject_id = ?");
    $stmt->execute([45]);

    $deleted_count = $stmt->rowCount();

    echo json_encode([
        "success" => true,
        "message" => "Deleted $deleted_count records from syllabus table for class_subject_id = 45",
        "deleted_rows" => $deleted_count
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>