<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

// Only POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "POST required"]);
    exit;
}

// Read JSON safely
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON"]);
    exit;
}

// Validate inputs
$name = isset($data['name']) ? trim($data['name']) : '';
$description = isset($data['description']) ? trim($data['description']) : '';
$process_id = isset($data['process_id']) && $data['process_id']
    ? (int)$data['process_id']
    : null;

// Google Forms features
$theme_color = $data['theme_color'] ?? '#3C3C3C';
$show_progress_bar = $data['show_progress_bar'] ?? 1;
$shuffle_questions = $data['shuffle_questions'] ?? 0;
$form_status = $data['form_status'] ?? 'draft';
$allow_response_editing = $data['allow_response_editing'] ?? 0;

// TEMP: until auth is wired
$created_by = 1;

if ($name === '') {
    http_response_code(400);
    echo json_encode(["error" => "Form name required"]);
    exit;
}

// Insert
$stmt = $pdo->prepare("
    INSERT INTO forms (
        name, description, created_by, process_id,
        theme_color, show_progress_bar, shuffle_questions,
        form_status, allow_response_editing
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
");

$stmt->execute([
    $name,
    $description,
    $created_by,
    $process_id,
    $theme_color,
    $show_progress_bar ? 1 : 0,
    $shuffle_questions ? 1 : 0,
    $form_status,
    $allow_response_editing ? 1 : 0
]);

echo json_encode([
    "success" => true,
    "id" => $pdo->lastInsertId()
]);
