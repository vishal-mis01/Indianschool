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
    $form_id = (int)($data['form_id'] ?? 0);
    
    if ($form_id <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Form ID required"]);
        exit;
    }

    $updates = [];
    $params = [];

    // Allow updating these fields
    $updateable = [
        'name', 'description', 'theme_color', 'show_progress_bar',
        'shuffle_questions', 'form_status', 'allow_response_editing'
    ];

    foreach ($updateable as $field) {
        if (isset($data[$field])) {
            $updates[] = "$field = ?";
            
            // Type casting
            if (in_array($field, ['show_progress_bar', 'shuffle_questions', 'allow_response_editing'])) {
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

    $params[] = $form_id;

    $stmt = $pdo->prepare("
        UPDATE forms
        SET " . implode(", ", $updates) . "
        WHERE id = ?
    ");

    $stmt->execute($params);

    echo json_encode([
        "success" => true,
        "message" => "Form updated successfully"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>
