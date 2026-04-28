<?php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../php-error.log');
error_reporting(E_ALL);

require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

// Database query with error handling
try {
    $userId = (int)$auth_user['id'];

    $stmt = $pdo->prepare("
      SELECT
        fa.id AS assignment_id,
        fa.form_id,
        f.name AS form_name,
        fa.is_fms,
        fa.process_id
      FROM forms_assignment fa
      JOIN forms f ON f.id = fa.form_id
      WHERE fa.assigned_to = ? AND fa.is_active = 1
      ORDER BY fa.created_at DESC
    ");

    $stmt->execute([$userId]);
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode($result);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed", "details" => $e->getMessage()]);
}
exit;
