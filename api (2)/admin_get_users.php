<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . "/config.php";

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

/*
  Admin-only endpoint
  Returns list of users that forms can be assigned to
*/

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode(["error" => "GET required"]);
    exit;
}

try {

    $stmt = $pdo->query("
        SELECT 
            id,
            name,
            email,
            role
        FROM users
        WHERE role IN ('user', 'process_coordinator')
        ORDER BY name ASC
    ");

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($users);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to load users"]);
}
