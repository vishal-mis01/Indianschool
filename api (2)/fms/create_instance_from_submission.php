<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "POST required"]);
    exit;
}

$submission_id = intval($_POST['submission_id'] ?? 0);
if ($submission_id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "submission_id missing"]);
    exit;
}

$user_id = $auth_user['id'];

/* 1️⃣ find process linked to form */
$stmt = $pdo->prepare("
    SELECT f.process_id
    FROM form_submissions fs
    JOIN forms f ON f.id = fs.form_id
    WHERE fs.id = ?
");
$stmt->execute([$submission_id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row || !$row['process_id']) {
    echo json_encode(["success" => true, "note" => "No FMS linked"]);
    exit;
}

$process_id = $row['process_id'];

/* 2️⃣ create FMS instance */
$stmt = $pdo->prepare("
    INSERT INTO fms_instances
    (process_id, reference_title, created_by, created_at)
    VALUES (?, ?, ?, NOW())
");
$stmt->execute([
    $process_id,
    "Form Submission #".$submission_id,
    $user_id
]);

$instance_id = $pdo->lastInsertId();

/* 2.5️⃣ Store form data with field names */
$formData = [];
$stmt = $pdo->prepare("
    SELECT ff.field_name, fsv.value
    FROM form_submission_values fsv
    JOIN form_fields ff ON ff.id = fsv.field_id
    WHERE fsv.submission_id = ?
");
$stmt->execute([$submission_id]);
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $formData[$row['field_name']] = $row['value'];
}

$stmt = $pdo->prepare("
    UPDATE fms_instances
    SET form_data = ?
    WHERE id = ?
");
$stmt->execute([json_encode($formData), $instance_id]);

/* 3️⃣ create steps */
$stmt = $pdo->prepare("
    SELECT id, step_order, planned_duration, planned_unit
    FROM fms_steps
    WHERE process_id = ?
    ORDER BY step_order ASC
");
$stmt->execute([$process_id]);
$steps = $stmt->fetchAll(PDO::FETCH_ASSOC);

$now = time();

foreach ($steps as $s) {
    $planned_at = date(
        "Y-m-d H:i:s",
        $now + ($s['planned_duration'] * (
            $s['planned_unit'] === 'days' ? 86400 : 3600
        ))
    );

    $pdo->prepare("
        INSERT INTO fms_instance_steps
        (instance_id, step_id, assigned_to, planned_at, status)
        VALUES (?, ?, ?, ?, 'pending')
    ")->execute([
        $instance_id,
        $s['id'],
        $user_id,
        $planned_at
    ]);

    $now = strtotime($planned_at);
}

echo json_encode([
    "success" => true,
    "instance_id" => $instance_id
]);
