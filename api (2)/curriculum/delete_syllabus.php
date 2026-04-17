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

$class_subject_id = null;

// Accept either form-post or JSON body
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!empty($_POST['class_subject_id'])) {
        $class_subject_id = (int)$_POST['class_subject_id'];
    } else {
        $rawBody = file_get_contents('php://input');
        $json = json_decode($rawBody, true);
        if (is_array($json) && isset($json['class_subject_id'])) {
            $class_subject_id = (int)$json['class_subject_id'];
        }
    }
}

error_log("delete_syllabus.php: auth_user_id=" . ($auth_user['id'] ?? 'none') . ", role=" . ($auth_user['role'] ?? 'none') . ", class_subject_id=" . ($class_subject_id ?? 'null'));

if (!$class_subject_id) {
    http_response_code(400);
    echo json_encode(["error" => "class_subject_id required"]);
    exit;
}

try {
    $pdo->beginTransaction();

    // Clear dependent progress entries first to avoid orphaned progress rows
    $stmt = $pdo->prepare("DELETE FROM user_syllabus_progress WHERE class_subject_id = ?");
    $stmt->execute([$class_subject_id]);
    $progressDeleted = $stmt->rowCount();

    // Remove syllabus entries
    $stmt = $pdo->prepare("DELETE FROM syllabus WHERE class_subject_id = ?");
    $stmt->execute([$class_subject_id]);
    $syllabusDeleted = $stmt->rowCount();

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "class_subject_id" => $class_subject_id,
        "deleted_syllabus_rows" => $syllabusDeleted,
        "deleted_progress_rows" => $progressDeleted,
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => "Failed to delete syllabus: " . $e->getMessage()]);
}
