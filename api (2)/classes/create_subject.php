<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

try {
    // Accept both form-encoded and JSON bodies
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $name = trim($input['name'] ?? $input['subject_name'] ?? ($_POST['name'] ?? ''));
    $description = trim($input['description'] ?? ($_POST['description'] ?? ''));
    $has_activities = isset($input['has_activities']) ? (bool)$input['has_activities'] : false;

    if (!$name) {
        http_response_code(400);
        echo json_encode(["error" => "Subject name required"]);
        exit;
    }

    // Use actual DB column name: subject_name
    $stmt = $pdo->prepare(
        "INSERT INTO subjects (subject_name, description, has_activities) VALUES (?, ?, ?)"
    );
    $stmt->execute([$name, $description ?: null, $has_activities]);

    echo json_encode([
        "success" => true,
        "id" => $pdo->lastInsertId()
    ]);
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate') !== false) {
        http_response_code(409);
        echo json_encode(["error" => "Subject name already exists", "details" => $e->getMessage()]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
