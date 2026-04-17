<?php
require_once __DIR__ . '/../config.php'; // $pdo
require_once __DIR__ . '/../auth.php';   // $user

// ===== METHOD CHECK =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "POST required"]);
    exit;
}

// ===== INPUT =====
$instanceStepId = (int)($_POST['instance_step_id'] ?? 0);
$newStatus      = $_POST['status'] ?? '';

if ($instanceStepId <= 0 || !in_array($newStatus, ['completed'])) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid input"]);
    exit;
}

// ===== LOAD STEP INSTANCE =====
$stmt = $pdo->prepare("
    SELECT 
        isi.id,
        isi.instance_id,
        isi.step_order,
        isi.assigned_to,
        isi.status,
        fs.requires_upload
    FROM fms_steps_instances isi
    JOIN fms_steps fs ON fs.id = isi.step_id
    WHERE isi.id = ?
");
$stmt->execute([$instanceStepId]);
$step = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$step) {
    http_response_code(404);
    echo json_encode(["error" => "Step not found"]);
    exit;
}

// ===== AUTH CHECK =====
if ((int)$step['assigned_to'] !== (int)$auth_user['id']) {
    http_response_code(403);
    echo json_encode(["error" => "Not assigned to you"]);
    exit;
}

// ===== ALREADY COMPLETED =====
if ($step['status'] === 'completed') {
    echo json_encode(["success" => true, "message" => "Already completed"]);
    exit;
}

// ===== ENFORCE STEP ORDER =====
$check = $pdo->prepare("
    SELECT 1
    FROM fms_steps_instances
    WHERE instance_id = ?
      AND step_order < ?
      AND status != 'completed'
    LIMIT 1
");
$check->execute([
    $step['instance_id'],
    $step['step_order']
]);

if ($check->fetch()) {
    http_response_code(409);
    echo json_encode([
        "error" => "Previous steps must be completed first"
    ]);
    exit;
}

// ===== FILE REQUIRED CHECK =====
if ((int)$step['requires_upload'] === 1 && empty($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(["error" => "File upload required"]);
    exit;
}

// ===== OPTIONAL FILE UPLOAD =====
if (!empty($_FILES['file'])) {
    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $filename = uniqid('step_') . '_' . basename($_FILES['file']['name']);
    $path = $uploadDir . $filename;

    if (!move_uploaded_file($_FILES['file']['tmp_name'], $path)) {
        http_response_code(500);
        echo json_encode(["error" => "File upload failed"]);
        exit;
    }

    $pdo->prepare("
        UPDATE fms_steps_instances
        SET uploaded_file = ?
        WHERE id = ?
    ")->execute([$filename, $instanceStepId]);
}

// ===== COMPLETE STEP =====
$pdo->prepare("
    UPDATE fms_steps_instances
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = ?
")->execute([$instanceStepId]);

echo json_encode([
    "success" => true,
    "completed_at" => date('Y-m-d H:i:s')
]);
