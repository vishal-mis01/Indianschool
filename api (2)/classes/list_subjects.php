<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';

header("Content-Type: application/json");

try {
    // Use actual DB columns and alias for compatibility
    $stmt = $pdo->query("SELECT subject_id AS id, subject_name AS name, description, has_activities FROM subjects ORDER BY subject_name ASC");
    $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($subjects);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
