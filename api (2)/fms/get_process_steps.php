<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php'; // db
require_once __DIR__ . '/../auth.php';   // user/admin check

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

if (!isset($auth_user)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$process_id = $_GET['process_id'];

$stmt = $pdo->prepare("
  SELECT
    id,
    step_order,
    step_name,
    user_id,
    planned_duration,
    planned_unit,
    requires_upload
  FROM fms_steps
  WHERE process_id = ?
  ORDER BY step_order
");

$stmt->execute([$process_id]);
echo json_encode($stmt->fetchAll());
