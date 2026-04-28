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

$assignment_id = $_GET['id'] ?? null;

if (!$assignment_id) {
    http_response_code(400);
    echo json_encode(["error" => "assignment id required"]);
    exit;
}

try {
    $stmt = $pdo->prepare("DELETE FROM user_class_subjects WHERE id = ?");
    $stmt->execute([$assignment_id]);
    echo json_encode(["success" => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
