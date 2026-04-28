<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../api_bootstrap.php';
require_once __DIR__ . '/../config.php'; // db
require_once __DIR__ . '/../auth.php';   // user/admin check

if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}


$pdo->prepare("
  DELETE FROM fms_steps
  WHERE id = ?
")->execute([$_POST['step_id']]);

echo json_encode(["deleted" => true]);
