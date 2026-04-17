<?php
require_once __DIR__ . '/../config.php'; // db
require_once __DIR__ . '/../auth.php';   // user/admin check

header("Content-Type: application/json");

/* ===== CORS ===== */
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = [
    'http://localhost:3001',
    'http://localhost:8081',
    'http://localhost:8087',
    'http://localhost:8088',
    'https://indiangroupofschools.com'
];
if (in_array($origin, $allowed)) {
    header("Access-Control-Allow-Origin: $origin");
}
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PATCH");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
/* ================= */

if (!isset($auth_user)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// Accept both POST data and JSON body
$data = $_POST;
$content_type = $_SERVER['CONTENT_TYPE'] ?? '';

error_log("Content-Type: " . $content_type);
error_log("POST data: " . json_encode($_POST));

// Check if it's JSON (with or without charset)
if (empty($data) && (strpos($content_type, 'application/json') !== false)) {
    $json = json_decode(file_get_contents("php://input"), true);
    $data = $json ?? [];
    error_log("Parsed JSON data: " . json_encode($data));
}

$step_id = $data['step_id'] ?? null;
$file_data = $data['file_data'] ?? null;
$file_name = $data['file_name'] ?? 'upload';

error_log("After parsing - step_id: $step_id, has_file_data: " . (!empty($file_data) ? 'yes' : 'no'));
error_log("All data keys: " . json_encode(array_keys($data)));

if (!$step_id) {
    http_response_code(400);
    echo json_encode([
        "error" => "Missing step_id",
        "received_keys" => array_keys($data),
        "content_type" => $content_type,
        "debug_post" => $_POST
    ]);
    exit;
}

if (!$file_data) {
    http_response_code(400);
    echo json_encode(["error" => "Missing file data"]);
    exit;
}

// Decode base64 and save file
$dir = __DIR__ . "/../../uploads/";
if (!is_dir($dir)) mkdir($dir, 0777, true);

$path = $dir . time() . "_" . basename($file_name);
$binary = base64_decode($file_data, true);

if ($binary === false) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid base64 data"]);
    exit;
}

if (file_put_contents($path, $binary) === false) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to write file"]);
    exit;
}

$stmt = $pdo->prepare("
UPDATE fms_instance_steps
SET upload_path = ?, status = 'complete', actual_at = NOW()
WHERE id = ? AND assigned_to = ?
");

$success = $stmt->execute([$path, $step_id, $auth_user['id']]);

if ($stmt->rowCount() === 0) {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Step not found or not assigned to you"
    ]);
    exit;
}

echo json_encode(["success" => true]);
