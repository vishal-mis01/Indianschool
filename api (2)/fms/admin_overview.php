<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php'; // db
require_once __DIR__ . '/../auth.php';   // user/admin check

if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

$stmt = $pdo->query("
  SELECT
    fi.reference_title,
    fs.step_name,
    ist.status,
    ist.planned_at,
    ist.actual_at,
    ist.time_delay,
    ist.upload_path
  FROM fms_instance_steps ist
  JOIN fms_instances fi ON fi.id = ist.instance_id
  JOIN fms_steps fs ON fs.id = ist.step_id
  ORDER BY fi.id, fs.step_order
");

echo json_encode($stmt->fetchAll());
