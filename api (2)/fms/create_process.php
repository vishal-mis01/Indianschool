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

$name = trim($data['name'] ?? '');
$description = trim($data['description'] ?? '');
$planned_duration = (int)($data['planned_duration'] ?? 0);
$planned_unit = $data['planned_unit'] ?? 'hours';

if ($name === '') {
    http_response_code(400);
    echo json_encode(["error" => "Process name is required"]);
    exit;
}

$stmt = $pdo->prepare("
    INSERT INTO fms_processes
        (name, description, planned_duration, planned_unit, is_active, created_at)
    VALUES
        (:name, :description, :planned_duration, :planned_unit, 1, NOW())
");

$stmt->execute([
    ':name' => $name,
    ':description' => $description,
    ':planned_duration' => $planned_duration,
    ':planned_unit' => $planned_unit,
]);

echo json_encode([
    "success" => true,
    "process_id" => $pdo->lastInsertId()
]);
