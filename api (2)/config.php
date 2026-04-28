<?php
// ===== CRITICAL: SEND CORS HEADERS IMMEDIATELY =====
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");
header("Access-Control-Max-Age: 86400");

// ===== HANDLE PREFLIGHT OPTIONS REQUEST =====
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

header("Content-Type: application/json");

// Include error handler AFTER CORS headers are sent
require_once __DIR__ . '/error_handler.php';

// NEVER output HTML errors in API
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');
error_reporting(E_ALL);

// Database (NO output, NO echo, NO var_dump)
try {
    $pdo = new PDO(
        "mysql:host=localhost;dbname=u597629147_tasks_db;charset=utf8mb4",
        "u597629147_tasks_user",
        "hZHwZc!$8",
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed"]);
    exit;
}