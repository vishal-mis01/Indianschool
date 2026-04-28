<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

$stmt = $pdo->query("
    SELECT
        fp.id AS process_id,
        fp.name AS process_name,

        COUNT(fi.id) AS total_instances,
        SUM(
            CASE 
                WHEN fi.id IS NOT NULL
                 AND NOT EXISTS (
                     SELECT 1 FROM fms_instance_steps s
                     WHERE s.instance_id = fi.id
                     AND s.status != 'completed'
                 )
                THEN 1 ELSE 0
            END
        ) AS completed_instances

    FROM fms_processes fp
    LEFT JOIN fms_instances fi ON fi.process_id = fp.id
    GROUP BY fp.id
    ORDER BY fp.name
");

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
