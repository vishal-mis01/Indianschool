<?php
header("Content-Type: application/json");

try {
    require_once __DIR__ . '/../config.php';
    echo json_encode([
        "success" => true,
        "message" => "Database connected",
        "database" => "OK"
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Connection failed",
        "message" => $e->getMessage()
    ]);
}
