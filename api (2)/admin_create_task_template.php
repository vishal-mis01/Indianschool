<?php
require "config.php";
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$title = $_POST["title"] ?? null;
$frequency = $_POST["frequency"] ?? null;
$department = $_POST["department"] ?? null;
$requires_photo = isset($_POST["requires_photo"]) ? (int)$_POST["requires_photo"] : 0;

if (!$title || !$frequency) {
    http_response_code(400);
    echo json_encode(["error" => "Missing title or frequency"]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO task_templates
        (title, frequency, department, requires_photo)
        VALUES (?, ?, ?, ?)
    ");

    $stmt->execute([
        $title,
        $frequency,
        $department,
        $requires_photo
    ]);

    echo json_encode([
        "success" => true,
        "id" => $pdo->lastInsertId()
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
