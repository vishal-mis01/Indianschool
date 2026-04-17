<?php
/**
 * Login Link Handler
 * Validates login tokens and returns authentication data for API calls or redirects for browser access
 */
require_once "api/config.php";

$token = $_GET['token'] ?? '';

if (!$token) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid login link. Please request a new one.']);
    exit;
}

try {
    // Decode and validate token
    $tokenPayload = base64_decode(str_replace(['-', '_'], ['+', '/'], $token));
    $tokenData = json_decode($tokenPayload, true);

    if (!$tokenData || !isset($tokenData['user_id']) || !isset($tokenData['exp'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid login link. Please request a new one.']);
        exit;
    }

    // Check if token is expired
    if (time() > $tokenData['exp']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'This login link has expired. Please request a new one.']);
        exit;
    }

    // Check token in database
    $stmt = $pdo->prepare("
        SELECT lt.*, u.role, u.email
        FROM login_tokens lt
        JOIN users u ON lt.user_id = u.id
        WHERE lt.token = ? AND lt.used = 0 AND lt.expires_at > NOW()
    ");
    $stmt->execute([$token]);
    $tokenRecord = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$tokenRecord) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired login link. Please request a new one.']);
        exit;
    }

    // Mark token as used
    $stmt = $pdo->prepare("UPDATE login_tokens SET used = 1 WHERE id = ?");
    $stmt->execute([$tokenRecord['id']]);

    // Generate authentication token for the user
    $authTokenData = [
        'user_id' => $tokenRecord['user_id'],
        'role' => $tokenRecord['role'],
        'iat' => time(),
        'exp' => time() + (24 * 60 * 60) // 24 hours
    ];

    $authTokenPayload = json_encode($authTokenData);
    $authToken = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($authTokenPayload));

    // Check if this is an API request (from the app) or direct browser access
    $isApiRequest = isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

    if ($isApiRequest) {
        // Return JSON response for API calls
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'token' => $authToken,
            'user_id' => $tokenRecord['user_id'],
            'role' => $tokenRecord['role'],
            'message' => 'Login successful!'
        ]);
    } else {
        // Redirect to app with token for browser access
        $appUrl = "https://indiangroupofschools.com/tasks-app?token=" . $authToken;
        header("Location: " . $appUrl);
    }
    exit;

} catch (Exception $e) {
    error_log("Login link validation error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred. Please try again.']);
}
?>