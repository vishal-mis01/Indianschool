<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

if (!isset($auth_user)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$stmt = $pdo->query("
  SELECT id, name, description, created_at
  FROM fms_processes
  WHERE is_active = 1
  ORDER BY created_at DESC
");

echo json_encode($stmt->fetchAll());
