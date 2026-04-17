<?php
header("Content-Type: application/json");

try {
    require_once __DIR__ . '/../config.php';
    require_once __DIR__ . '/../auth.php';
    
    echo json_encode([
        "success" => true,
        "message" => "Auth and database OK",
        "user_id" => $auth_user['id'] ?? null,
        "role" => $auth_user['role'] ?? null
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Test failed",
        "message" => $e->getMessage()
    ]);
}
