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
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $name = trim($input['name'] ?? $input['class_name'] ?? ($_POST['name'] ?? ''));
    $section = trim($input['section'] ?? $input['description'] ?? ($_POST['section'] ?? ''));

    if (!$name) {
        http_response_code(400);
        echo json_encode(["error" => "Class name required"]);
        exit;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO classes (class_name, section) VALUES (?, ?)"
    );
    $stmt->execute([$name, $section]);

    echo json_encode([
        "success" => true,
        "id" => $pdo->lastInsertId()
    ]);
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate') !== false) {
        http_response_code(409);
        echo json_encode(["error" => "Class name already exists", "details" => $e->getMessage()]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
