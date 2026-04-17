<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$user_id = $data['user_id'] ?? null;
$class_subject_id = $data['class_subject_id'] ?? null;

error_log("Received data: " . json_encode($data));

if (!$user_id || !$class_subject_id) {
    http_response_code(400);
    echo json_encode(["error" => "user_id and class_subject_id required"]);
    exit;
}

try {
    // Check if assignment already exists
    $stmt = $pdo->prepare("SELECT id FROM user_class_subjects WHERE user_id = ? AND class_subject_id = ?");
    $stmt->execute([$user_id, $class_subject_id]);
    $existing = $stmt->fetch();
    error_log("Checking assignment: user_id=$user_id, class_subject_id=$class_subject_id, found=" . ($existing ? 'yes' : 'no'));
    if ($existing) {
        http_response_code(409);
        echo json_encode(["error" => "User already assigned to this class-subject"]);
        exit;
    }

    // Insert the assignment
    $stmt = $pdo->prepare("INSERT INTO user_class_subjects (user_id, class_subject_id) VALUES (?, ?)");
    $stmt->execute([$user_id, $class_subject_id]);
    $assignment_id = $pdo->lastInsertId();
    
    echo json_encode(["success" => true, "id" => $assignment_id]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
