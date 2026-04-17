<?php
require_once __DIR__ . '/../config.php';

header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "POST required"]);
    exit;
}

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON"]);
    exit;
}

try {
    $field_id = (int)($data['field_id'] ?? 0);
    
    if ($field_id <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Field ID required"]);
        exit;
    }

    $updates = [];
    $params = [];

    // Allow updating these fields
    $updateable = [
        'label', 'field_type', 'is_required', 'options_json',
        'description', 'help_text', 'placeholder', 'validation_rules'
    ];

    foreach ($updateable as $field) {
        if (isset($data[$field])) {
            $updates[] = "$field = ?";
            
            // Handle JSON fields
            if ($field === 'validation_rules' && is_array($data[$field])) {
                $params[] = json_encode($data[$field]);
            } else if ($field === 'is_required') {
                $params[] = $data[$field] ? 1 : 0;
            } else {
                $params[] = $data[$field];
            }
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(["error" => "No fields to update"]);
        exit;
    }

    $params[] = $field_id;

    $stmt = $pdo->prepare("
        UPDATE form_fields
        SET " . implode(", ", $updates) . "
        WHERE id = ?
    ");

    $stmt->execute($params);

    echo json_encode([
        "success" => true,
        "message" => "Field updated successfully"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>
