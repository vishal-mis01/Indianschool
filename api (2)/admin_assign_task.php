<?php
require_once __DIR__ . '/_cors.php';
require "config.php";
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$raw = file_get_contents("php://input");

// Log the request for debugging
error_log("Raw input: " . $raw);
error_log("Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));

// Try to parse as JSON first, then fall back to form-encoded
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') !== false) {
    $data = json_decode($raw, true) ?? [];
    error_log("Parsed as JSON: " . json_encode($data));
} else {
    // Parse form-encoded data
    parse_str($raw, $data);
    error_log("Parsed as form-encoded: " . json_encode($data));
}

if (!isset($data["task_template_id"]) || !isset($data["start_date"])) {
    http_response_code(400);
    echo json_encode([
        "error" => "Missing required fields",
        "received_data" => $data,
        "raw_input" => $raw,
        "content_type" => $_SERVER['CONTENT_TYPE'] ?? 'not set'
    ]);
    exit;
}

// Validate datetime format: YYYY-MM-DD HH:MM:SS
if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $data["start_date"])) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid start_date format. Expected: YYYY-MM-DD HH:MM:SS"]);
    exit;
}

if ($data["end_date"] && !preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $data["end_date"])) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid end_date format. Expected: YYYY-MM-DD HH:MM:SS"]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO task_assignments
        (
            task_template_id,
            assigned_user_id,
            assigned_department,
            start_date,
            end_date,
            grace_days,
            skip_weekdays
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $data["task_template_id"],
        $data["assigned_user_id"] ?: null,
        $data["assigned_department"] ?: null,
        $data["start_date"],
        $data["end_date"] ?: null,
        isset($data["grace_days"]) ? (int)$data["grace_days"] : 0,
        $data["skip_weekdays"] ?: null
    ]);

    echo json_encode(["success" => true]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "error" => $e->getMessage()
    ]);
}
