<?php
require_once __DIR__ . '/../config.php';

header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "POST required"]);
    exit;
}

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON"]);
    exit;
}

$submission_id = intval($data['submission_id'] ?? 0);
$field_id = intval($data['field_id'] ?? 0);
$new_value = $data['value'] ?? null;

if ($submission_id <= 0 || $field_id <= 0 || $new_value === null) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required fields"]);
    exit;
}

try {
    $stmt = $pdo->prepare("UPDATE form_submission_values SET value = ? WHERE submission_id = ? AND field_id = ?");
    $stmt->execute([$new_value, $submission_id, $field_id]);

    echo json_encode([
        "success" => true,
        "message" => "Response value updated"
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
