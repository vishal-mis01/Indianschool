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
    $stmt = $pdo->prepare("
        SELECT 
            cs.class_subject_id,
            c.class_name,
            s.subject_name,
            c.class_id,
            s.subject_id
        FROM class_subjects cs
        JOIN classes c ON c.class_id = cs.class_id
        JOIN subjects s ON s.subject_id = cs.subject_id
        ORDER BY c.class_name, s.subject_name
    ");
    $stmt->execute();
    $classSubjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Convert to appropriate format
    foreach ($classSubjects as &$cs) {
        $cs['class_subject_id'] = (int)$cs['class_subject_id'];
        $cs['class_id'] = (int)$cs['class_id'];
        $cs['subject_id'] = (int)$cs['subject_id'];
        $cs['display_name'] = "{$cs['class_name']} - {$cs['subject_name']}";
    }

    echo json_encode($classSubjects);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
