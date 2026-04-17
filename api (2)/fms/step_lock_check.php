<?php
require_once __DIR__ . '/../config.php'; // db
require_once __DIR__ . '/../auth.php';   // user/admin check

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

function isStepUnlocked($pdo, $instanceStepId) {

  $q = $pdo->prepare("
    SELECT fs.step_order, ist.instance_id
    FROM fms_instance_steps ist
    JOIN fms_steps fs ON fs.id = ist.step_id
    WHERE ist.id = ?
  ");
  $q->execute([$instanceStepId]);
  $step = $q->fetch();

  $check = $pdo->prepare("
    SELECT COUNT(*) FROM fms_instance_steps p
    JOIN fms_steps ps ON ps.id = p.step_id
    WHERE p.instance_id = ?
      AND ps.step_order < ?
      AND p.status = 'pending'
  ");
  $check->execute([$step['instance_id'], $step['step_order']]);

  return $check->fetchColumn() == 0;
}
