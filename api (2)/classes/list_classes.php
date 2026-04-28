<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

try {
    // Check if user is authenticated
    if (!isset($auth_user) || !isset($auth_user['id'])) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized"]);
        exit;
    }

    // Return all classes for admin/class management using actual DB columns
    $stmt = $pdo->query("SELECT class_id AS id, class_name AS name, section AS description FROM classes ORDER BY class_name ASC");
    $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($classes);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
