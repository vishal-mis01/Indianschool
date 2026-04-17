<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

$subject_id = $_GET['id'] ?? null;

if (!$subject_id) {
    http_response_code(400);
    echo json_encode(["error" => "Subject ID required"]);
    exit;
}

try {
    // Delete using actual PK: subject_id
    $stmt = $pdo->prepare("DELETE FROM subjects WHERE subject_id = ?");
    $stmt->execute([$subject_id]);
    echo json_encode(["success" => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to delete subject"]);
}
