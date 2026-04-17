<?php
// Always require config.php first for global CORS and JSON headers
require_once __DIR__ . "/config.php";

/*
|--------------------------------------------------------------------------
| AUTHORIZATION HEADER
|--------------------------------------------------------------------------
*/
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
    http_response_code(401);
    echo json_encode(["error" => "No token"]);
    exit;
}

$token = trim(str_replace('Bearer ', '', $authHeader));

/*
|--------------------------------------------------------------------------
| DECODE TOKEN
|--------------------------------------------------------------------------
*/
$decoded = base64_decode($token);
if (!$decoded || !str_contains($decoded, '|')) {
    http_response_code(401);
    echo json_encode(["error" => "Invalid token"]);
    exit;
}

[$userId, $timestamp] = explode('|', $decoded);

/*
|--------------------------------------------------------------------------
| FETCH USER
|-------------------------------------------------------
-------------------
*/
try {
    $stmt = $pdo->prepare("
        SELECT id, role
        FROM users
        WHERE id = ?
    ");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "User not found"]);
        exit;
    }
    
    // ✅ SET $auth_user so other files can use it
    $auth_user = $user;
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "Authentication failed", "details" => $e->getMessage()]);
    exit;
}

