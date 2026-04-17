<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

if (!$auth_user || !isset($auth_user['id'])) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

try {
    $stmt = $pdo->prepare(
        "SELECT DISTINCT c.id AS id, c.name AS name, c.section
         FROM user_class_subjects ucs
         JOIN class_subjects cs ON ucs.class_subject_id = cs.class_subject_id
         JOIN classes c ON cs.class_id = c.id
         WHERE ucs.user_id = ?
         ORDER BY c.name ASC"
    );
    $stmt->execute([(int)$auth_user['id']]);
    $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($classes);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
