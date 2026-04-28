<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';

header("Content-Type: application/json");

try {
    $field_id = intval($_GET['field_id'] ?? 0);
    
    if ($field_id <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Field ID required"]);
        exit;
    }

    // Delete field
    $stmt = $pdo->prepare("DELETE FROM form_fields WHERE id = ?");
    $stmt->execute([$field_id]);

    echo json_encode([
        "success" => true,
        "message" => "Field deleted successfully"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>
