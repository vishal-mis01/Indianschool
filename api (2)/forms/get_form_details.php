<?php
require_once __DIR__ . '/../config.php';

header("Content-Type: application/json");

try {
    $form_id = intval($_GET['form_id'] ?? 0);
    
    if ($form_id <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Form ID required"]);
        exit;
    }

    // Get form details
    $stmt = $pdo->prepare("
        SELECT
            id, name, description, created_by, created_at, process_id,
            theme_color, show_progress_bar, shuffle_questions,
            form_status, allow_response_editing
        FROM forms
        WHERE id = ?
    ");
    $stmt->execute([$form_id]);
    $form = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$form) {
        http_response_code(404);
        echo json_encode(["error" => "Form not found"]);
        exit;
    }

    // Get all fields
    $stmt = $pdo->prepare("
        SELECT
            id, label, field_type, is_required, options_json,
            description, help_text, placeholder, validation_rules, field_order
        FROM form_fields
        WHERE form_id = ?
        ORDER BY field_order ASC, id ASC
    ");
    $stmt->execute([$form_id]);
    $fields = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Parse JSON fields
    foreach ($fields as &$field) {
        if ($field['options_json']) {
            $field['options'] = json_decode($field['options_json'], true) ?? [];
        }
        if ($field['validation_rules']) {
            $field['validation'] = json_decode($field['validation_rules'], true) ?? [];
        }
        unset($field['options_json'], $field['validation_rules']);
    }

    echo json_encode([
        "success" => true,
        "form" => $form,
        "fields" => $fields
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>
