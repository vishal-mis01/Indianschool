<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$class_id = $data['class_id'] ?? null;
$subject_id = $data['subject_id'] ?? null;

if (!$class_id || !$subject_id) {
    http_response_code(400);
    echo json_encode(["error" => "class_id and subject_id required"]);
    exit;
}

try {
    // Check if mapping already exists (use actual PK `class_subject_id`)
    $stmt = $pdo->prepare("SELECT class_subject_id FROM class_subjects WHERE class_id = ? AND subject_id = ?");
    $stmt->execute([$class_id, $subject_id]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["error" => "Subject already assigned to this class"]);
        exit;
    }

    // Insert the mapping
    $stmt = $pdo->prepare("INSERT INTO class_subjects (class_id, subject_id) VALUES (?, ?)");
    $stmt->execute([$class_id, $subject_id]);
    $class_subject_id = $pdo->lastInsertId();
    
    echo json_encode(["success" => true, "class_subject_id" => $class_subject_id]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
