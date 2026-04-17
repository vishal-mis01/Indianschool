<?php
/**
 * Request Login Link API Endpoint
 * Generates a secure login link and sends it via email
 * The link contains a JWT-like token that expires in 15 minutes
 */
require_once "config.php";

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$email = trim($data['email'] ?? '');

if (!$email) {
    http_response_code(400);
    echo json_encode(["error" => "Email required"]);
    exit;
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid email format"]);
    exit;
}

try {
    // Check if user exists
    $stmt = $pdo->prepare("SELECT id, role FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // Don't reveal if email exists or not for security
        echo json_encode(["success" => true, "message" => "If an account with this email exists, a login link has been sent."]);
        exit;
    }

    // Generate secure token
    $tokenData = [
        'user_id' => $user['id'],
        'email' => $email,
        'role' => $user['role'],
        'exp' => time() + (15 * 60), // 15 minutes
        'iat' => time(),
        'type' => 'login_link'
    ];

    // Create JWT-like token (simple base64 encoding for demo - in production use proper JWT library)
    $tokenPayload = json_encode($tokenData);
    $token = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($tokenPayload));

    // Store token in database for validation
    $stmt = $pdo->prepare("
        INSERT INTO login_tokens (user_id, token, expires_at, used)
        VALUES (?, ?, FROM_UNIXTIME(?), 0)
        ON DUPLICATE KEY UPDATE
            token = VALUES(token),
            expires_at = VALUES(expires_at),
            used = 0
    ");
    $stmt->execute([$user['id'], $token, $tokenData['exp']]);

    // Generate login URL - redirect to web app with token
    // For local development, change this to your local Expo web URL
    // For production, use your deployed web app URL
    $loginUrl = "http://localhost:19006?token=" . $token; // Change this for production

    // Send email (simplified - in production use proper email service)
    $subject = "Your Login Link - IPS Tasks";
    $message = "
    <html>
    <body>
        <h2>Login to IPS Tasks</h2>
        <p>Click the link below to sign in to your account:</p>
        <p><a href='{$loginUrl}' style='background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Sign In</a></p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this link, please ignore this email.</p>
        <br>
        <p>Best regards,<br>IPS Tasks Team</p>
    </body>
    </html>
    ";

    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: IPS Tasks <noreply@indiangroupofschools.com>" . "\r\n";

    // Send email
    if (mail($email, $subject, $message, $headers)) {
        echo json_encode([
            "success" => true,
            "message" => "If an account with this email exists, a login link has been sent."
        ]);
    } else {
        // Log error but don't reveal to user
        error_log("Failed to send login link email to: " . $email);
        echo json_encode([
            "success" => true,
            "message" => "If an account with this email exists, a login link has been sent."
        ]);
    }

} catch (Exception $e) {
    error_log("Login link request error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Server error"]);
}