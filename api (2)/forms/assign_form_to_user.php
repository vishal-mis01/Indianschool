<?php
require_once __DIR__ . "/../config.php";
require_once __DIR__ . "/../auth.php";

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["error" => "POST required"]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON"]);
    exit;
}

$form_id    = (int)($input["form_id"] ?? 0);
$user_id    = (int)($input["user_id"] ?? 0);
$is_fms     = (int)($input["is_fms"] ?? 0);
$process_id = $is_fms ? (int)($input["process_id"] ?? 0) : null;

if ($form_id <= 0 || $user_id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Missing form_id or user_id"]);
    exit;
}

/* OPTIONAL: prevent duplicate active assignment */
$stmt = $pdo->prepare("
    SELECT id FROM forms_assignment
    WHERE form_id = ? AND assigned_to = ? AND is_active = 1
");
$stmt->execute([$form_id, $user_id]);

if ($stmt->fetch()) {
    echo json_encode(["success" => true, "message" => "Already assigned"]);
    exit;
}

/* INSERT ASSIGNMENT */
$stmt = $pdo->prepare("
    INSERT INTO forms_assignment
        (form_id, assigned_to, is_fms, process_id, is_active, created_at)
    VALUES
        (?, ?, ?, ?, 1, NOW())
");

$stmt->execute([
    $form_id,
    $user_id,
    $is_fms,
    $process_id
]);

echo json_encode(["success" => true]);
