<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';

header("Content-Type: application/json");

try {
    // table uses `class_id` and `class_name`; alias them to `id`/`name` for compatibility
    $stmt = $pdo->query("SELECT class_id AS id, class_name AS name, section FROM classes ORDER BY class_name ASC");
    $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($classes);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
