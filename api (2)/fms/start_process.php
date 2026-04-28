<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php'; // $pdo
require_once __DIR__ . '/../auth.php';   // $user

// ===== ADMIN ONLY =====
if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

// ===== METHOD CHECK =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "POST required"]);
    exit;
}

// ===== INPUT =====
$processId = (int)($_POST['process_id'] ?? 0);
$reference = trim($_POST['reference_title'] ?? '');

if ($processId <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "process_id required"]);
    exit;
}

try {
    $pdo->beginTransaction();

    /**
     * 1️⃣ CREATE INSTANCE
     */
    $stmt = $pdo->prepare("
        INSERT INTO fms_instances
            (process_id, reference_title, created_by)
        SELECT
            id,
            name,
            ?
        FROM fms_processes
        WHERE id = ?
    ");
    $stmt->execute([
        $auth_user['id'],
        $processId
    ]);

    $instanceId = (int)$pdo->lastInsertId();

    if (!$instanceId) {
        throw new Exception("Failed to create instance");
    }

    /**
     * 2️⃣ LOAD PROCESS STEPS
     */
    $stmt = $pdo->prepare("
        SELECT id, user_id, step_order
        FROM fms_steps
        WHERE process_id = ?
        ORDER BY step_order
    ");
    $stmt->execute([$processId]);
    $steps = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$steps) {
        throw new Exception("No steps found for process");
    }

    /**
     * 3️⃣ COPY STEPS INTO INSTANCE
     */
    $insert = $pdo->prepare("
        INSERT INTO fms_instance_steps
            (instance_id, step_id, step_order, assigned_to, status)
        VALUES (?, ?, ?, ?, 'pending')
    ");

    foreach ($steps as $step) {
        $insert->execute([
            $instanceId,
            $step['id'],
            $step['step_order'],
            $step['user_id']
        ]);
    }

    $pdo->commit();

    echo json_encode([
        "success"        => true,
        "instance_id"    => $instanceId,
        "steps_created"  => count($steps)
    ]);

} catch (Throwable $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        "error" => "Process start failed"
    ]);
}
