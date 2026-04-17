<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

header("Content-Type: application/json");

if (!isset($auth_user) || !in_array(($auth_user['role'] ?? ''), ['admin', 'process_coordinator'])) {
    http_response_code(403);
    echo json_encode(["error" => "Admin or Process Coordinator only"]);
    exit;
}

try {
    // Check if user_syllabus_progress table exists
    $checkTable = $pdo->query("SHOW TABLES LIKE 'user_syllabus_progress'");
    $tableExists = $checkTable->rowCount() > 0;

    // Check if user_class_subjects table has data
    $userSubjectsCount = $pdo->query("SELECT COUNT(*) as count FROM user_class_subjects")->fetch()['count'];

    // Check if users table has user role entries
    $usersCount = $pdo->query("SELECT COUNT(*) as count FROM users WHERE role = 'user'")->fetch()['count'];

    echo json_encode([
        'success' => true,
        'table_exists' => $tableExists,
        'user_subjects_count' => (int)$userSubjectsCount,
        'users_count' => (int)$usersCount,
        'database_check' => 'completed'
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database check failed',
        'details' => $e->getMessage()
    ]);
}