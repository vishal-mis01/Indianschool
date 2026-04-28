<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php'; // db
require_once __DIR__ . '/../auth.php';   // user/admin check

if ($user['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

$pdo->prepare("
  UPDATE fms_processes
  SET is_active = 0
  WHERE id = ?
")->execute([$_POST['process_id']]);

echo json_encode(["deleted" => true]);
