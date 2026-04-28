<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . "/../config.php"; // your config with $pdo

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

// Only POST
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["error" => "POST required"]);
    exit;
}

// Read JSON
$input = json_decode(file_get_contents("php://input"), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON"]);
    exit;
}

// Extract + defaults
$form_id      = intval($input["form_id"] ?? 0);
$label        = trim($input["label"] ?? "");
$field_type   = $input["field_type"] ?? "text";
$is_required  = intval($input["is_required"] ?? 0);
$options_json = $input["options_json"] ?? null;
$field_order  = intval($input["field_order"] ?? 0);

// Google Forms enhancements
$description = trim($input["description"] ?? "");
$help_text = trim($input["help_text"] ?? "");
$placeholder = trim($input["placeholder"] ?? "");
$validation_rules = isset($input["validation_rules"]) ? json_encode($input["validation_rules"]) : null;

// Validation
if ($form_id <= 0 || $label === "") {
    http_response_code(400);
    echo json_encode(["error" => "Missing required fields"]);
    exit;
}

// Auto field order if not provided
if ($field_order === 0) {
    $stmt = $pdo->prepare(
        "SELECT COALESCE(MAX(field_order), 0) + 1 FROM form_fields WHERE form_id = ?"
    );
    $stmt->execute([$form_id]);
    $field_order = (int)$stmt->fetchColumn();
}

// Insert
$stmt = $pdo->prepare("
    INSERT INTO form_fields
    (form_id, label, field_type, is_required, options_json, field_order,
     description, help_text, placeholder, validation_rules)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");

$stmt->execute([
    $form_id,
    $label,
    $field_type,
    $is_required,
    $options_json,
    $field_order,
    $description ?: null,
    $help_text ?: null,
    $placeholder ?: null,
    $validation_rules
]);

echo json_encode([
    "success" => true,
    "id" => $pdo->lastInsertId()
]);
