<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

$process_id = (int)($_GET['process_id'] ?? 0);
if (!$process_id) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(["error" => "process_id required"]);
    exit;
}
// Use correlated subqueries to get per-instance step counts safely.
$sql = "SELECT
    fi.id AS instance_id,
    fi.created_at,
    fp.name AS process_name,
    u.name AS started_by,
    (SELECT COUNT(1) FROM fms_instance_steps si WHERE si.instance_id = fi.id) AS total_steps,
    (SELECT COUNT(1) FROM fms_instance_steps si WHERE si.instance_id = fi.id AND si.status = 'completed') AS completed_steps,
    (SELECT MIN(si.step_order) FROM fms_instance_steps si WHERE si.instance_id = fi.id AND si.status != 'completed') AS current_step
FROM fms_instances fi
JOIN fms_processes fp ON fp.id = fi.process_id
JOIN users u ON u.id = fi.created_by
WHERE fi.process_id = :pid
ORDER BY fi.created_at DESC";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':pid' => $process_id]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ---- COMPUTED FIELDS ----
    foreach ($rows as &$r) {
        $r['total_steps'] = (int)($r['total_steps'] ?? 0);
        $r['completed_steps'] = (int)($r['completed_steps'] ?? 0);
        $r['progress_percent'] = $r['total_steps'] > 0
            ? (int)round(($r['completed_steps'] / $r['total_steps']) * 100)
            : 0;

        $r['status'] = ($r['completed_steps'] == $r['total_steps']) ? 'completed' : 'in_progress';
    }

    header('Content-Type: application/json');
    echo json_encode($rows);
    exit;
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(["error" => get_class($e), "message" => $e->getMessage()]);
    exit;
}
