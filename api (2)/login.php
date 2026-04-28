<?php
/**
 * Login API Endpoint
 * Supported Roles: admin, user, process_coordinator, ea (Executive Assistant), md (Managing Director)
 * Returns: token, user_id, role
 */
require_once __DIR__ . '/_cors.php';
require_once "config.php";

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

// ===== READ INPUT (JSON OR FORM) =====
$email = '';
$password = '';

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

if (strpos($contentType, 'application/json') !== false) {
    // JSON request
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $email = trim($data['email'] ?? '');
    $password = trim($data['password'] ?? '');
} else {
    // Form-data fallback
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
}

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(["error" => "Email and password required"]);
    exit;
}

// ===== AUTH =====
try {
    $stmt = $pdo->prepare("
        SELECT id, role, password_hash
        FROM users
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid credentials"]);
        exit;
    }

    if (!isset($user['password_hash'])) {
        http_response_code(500);
        echo json_encode(["error" => "Server configuration error: password_hash column missing"]);
        exit;
    }

    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid credentials"]);
        exit;
    }

    // ===== TOKEN =====
    $token = base64_encode($user['id'] . "|" . time());

    http_response_code(200);
    echo json_encode([
      "token" => $token,
      "user_id" => $user['id'],
      "role" => $user['role']
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "Authentication failed", "message" => $e->getMessage()]);
    exit;
}
