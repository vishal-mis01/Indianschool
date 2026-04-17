<?php
require 'config.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$today = date('Y-m-d');

$stmt = $pdo->prepare("
  SELECT u.name, u.department, tt.title
  FROM task_assignments ta
  JOIN task_templates tt ON tt.id = ta.task_template_id
  JOIN users u ON u.id = ta.assigned_user_id
  LEFT JOIN task_submissions ts
    ON ts.user_id = u.id
    AND ts.task_template_id = tt.id
    AND ts.task_date = ?
  WHERE ts.id IS NULL
    AND ta.start_date <= ?
");
$stmt->execute([$today, $today]);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
