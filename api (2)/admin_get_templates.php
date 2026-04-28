<?php
require_once __DIR__ . '/_cors.php';
require "config.php";
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
echo json_encode(
    $pdo->query("SELECT id, title FROM task_templates ORDER BY title")->fetchAll()
);
