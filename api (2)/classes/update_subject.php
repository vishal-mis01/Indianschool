<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $id = intval($input['id'] ?? 0);
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $has_activities = isset($input['has_activities']) ? (bool)$input['has_activities'] : false;

    if (!$id || !$name) {
        http_response_code(400);
        echo json_encode(["error" => "ID and name required"]);
        exit;
    }

    $stmt = $pdo->prepare(
        "UPDATE subjects SET subject_name = ?, description = ?, has_activities = ? WHERE subject_id = ?"
    );
    $stmt->execute([$name, $description ?: null, $has_activities, $id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(["success" => true]);
    } else {
        http_response_code(404);
        echo json_encode(["error" => "Subject not found or no changes"]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>