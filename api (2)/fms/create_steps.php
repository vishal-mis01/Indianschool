<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

if (!isset($auth_user)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// Read JSON body
$data = json_decode(file_get_contents("php://input"), true);

$process_id = (int)($data['process_id'] ?? 0);
$step_order = (int)($data['step_order'] ?? 0);
$step_name = trim($data['step_name'] ?? '');
$role_id = isset($data['role_id']) ? (int)$data['role_id'] : null;
$user_id = (int)($data['user_id'] ?? 0);
$planned_duration = (int)($data['planned_duration'] ?? 0);
$planned_unit = $data['planned_unit'] ?? 'hours';
$requires_upload = (int)($data['requires_upload'] ?? 0);

if (!$process_id || !$step_name || (!$role_id && !$user_id)) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required step fields"]);
    exit;
}

$stmt = $pdo->prepare("
    INSERT INTO fms_steps
        (process_id, step_order, step_name, role_id, user_id, planned_duration, planned_unit, requires_upload, created_at)
    VALUES
        (:process_id, :step_order, :step_name, :role_id, :user_id, :planned_duration, :planned_unit, :requires_upload, NOW())
");

$stmt->execute([
    ':process_id' => $process_id,
    ':step_order' => $step_order,
    ':step_name' => $step_name,
    ':role_id' => $role_id,
    ':user_id' => $user_id ?: null,
    ':planned_duration' => $planned_duration,
    ':planned_unit' => $planned_unit,
    ':requires_upload' => $requires_upload,
]);

echo json_encode([
    "success" => true,
    "step_id" => $pdo->lastInsertId()
]);
