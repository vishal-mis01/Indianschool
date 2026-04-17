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

$class_id = $_GET['class_id'] ?? null;

if (!$class_id) {
    http_response_code(400);
    echo json_encode(["error" => "class_id required"]);
    exit;
}

try {
    // Join using subject_id PK and select subject_name
    $stmt = $pdo->prepare("
        SELECT cs.class_subject_id, cs.class_id, cs.subject_id, s.subject_name as subject_name
        FROM class_subjects cs
        JOIN subjects s ON cs.subject_id = s.subject_id
        WHERE cs.class_id = ?
        ORDER BY s.subject_name ASC
    ");
    $stmt->execute([$class_id]);
    $class_subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($class_subjects);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
