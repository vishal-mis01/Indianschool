<?php
require_once __DIR__ . '/../config.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$stmt = $pdo->query("
  SELECT id, name, created_at
  FROM forms
  ORDER BY id DESC
");

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
