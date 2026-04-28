<?php
require_once __DIR__ . '/_cors.php';
require "config.php";

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

try {
    $stmt = $pdo->prepare("
        SELECT 
            ta.id,
            ta.start_date,
            ta.end_date,
            ta.grace_days,
            ta.skip_weekdays,
            tt.title AS task_title,
            u.name AS user_name,
            ta.assigned_department AS department
        FROM task_assignments ta
        JOIN task_templates tt ON tt.id = ta.task_template_id
        LEFT JOIN users u ON u.id = ta.assigned_user_id
        ORDER BY ta.id DESC
    ");

    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($rows);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Failed to load assignments",
        "details" => $e->getMessage()
    ]);
}
