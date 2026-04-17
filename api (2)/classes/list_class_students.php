<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

$class_id = intval($_GET['class_id'] ?? 0);
if ($class_id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "class_id is required"]);
    exit;
}

if (!$auth_user || !isset($auth_user['id'])) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

try {
    if (($auth_user['role'] ?? '') !== 'admin') {
        $verify = $pdo->prepare(
            "SELECT 1 FROM user_class_subjects ucs
             JOIN class_subjects cs ON ucs.class_subject_id = cs.class_subject_id
             WHERE ucs.user_id = ? AND cs.class_id = ?
             LIMIT 1"
        );
        $verify->execute([(int)$auth_user['id'], $class_id]);
        if (!$verify->fetch()) {
            http_response_code(403);
            echo json_encode(["error" => "Forbidden"]);
            exit;
        }
    }

    $stmt = $pdo->prepare(
        "SELECT u.id, u.name, u.email
         FROM class_students cs
         JOIN users u ON cs.user_id = u.id
         WHERE cs.class_id = ? AND u.role = 'student'
         ORDER BY u.name ASC"
    );
    $stmt->execute([$class_id]);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($students);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
