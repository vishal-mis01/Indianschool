<?php
// ==================================================
// FMS INSTANCE CREATION (DUAL USE: INTERNAL + API)
// ==================================================

if (!isset($INTERNAL_CALL)) {
    ini_set('display_errors', 1);
    error_reporting(E_ALL);
    header("Content-Type: application/json");
}

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

// ------------------------------
// AUTH CHECK (API ONLY)
// ------------------------------
if (!isset($INTERNAL_CALL)) {
    if (!$auth_user || !isset($auth_user['id'])) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized"]);
        exit;
    }
}

// ------------------------------
// INPUT
// ------------------------------
$submission_id = intval($_POST['submission_id'] ?? 0);

if ($submission_id <= 0) {
    if (!isset($INTERNAL_CALL)) {
        http_response_code(400);
        echo json_encode(["error" => "submission_id missing"]);
        exit;
    }
    return;
}

try {
    // ==================================================
    // 1️⃣ GET FORM + PROCESS LINK
    // ==================================================
    $stmt = $pdo->prepare("
        SELECT f.id AS form_id, f.process_id
        FROM form_submissions fs
        JOIN forms f ON f.id = fs.form_id
        WHERE fs.id = ?
        LIMIT 1
    ");
    $stmt->execute([$submission_id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || empty($row['process_id'])) {
        // Form is NOT linked to FMS → silently ignore
        if (!isset($INTERNAL_CALL)) {
            echo json_encode([
                "success" => true,
                "message" => "Form not linked to FMS"
            ]);
            exit;
        }
        return;
    }

    $process_id = (int)$row['process_id'];

    // ==================================================
    // 1B️⃣ GET FORM SUBMISSION DATA
    // ==================================================
    $stmt = $pdo->prepare("
        SELECT fsv.field_id, fsv.value
        FROM form_submission_values fsv
        WHERE fsv.submission_id = ?
    ");
    $stmt->execute([$submission_id]);
    $formValues = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $formData = [];
    foreach ($formValues as $fv) {
        $formData[$fv['field_id']] = $fv['value'];
    }
    $formDataJson = json_encode($formData);

    // ==================================================
    // 2️⃣ PREVENT DUPLICATE INSTANCE
    // ==================================================
    $stmt = $pdo->prepare("
        SELECT id FROM fms_instances
        WHERE process_id = ?
          AND reference_title = ?
        LIMIT 1
    ");
    $stmt->execute([$process_id, 'FORM#' . $submission_id]);

    if ($stmt->fetch()) {
        if (!isset($INTERNAL_CALL)) {
            echo json_encode([
                "success" => true,
                "message" => "FMS instance already exists"
            ]);
            exit;
        }
        return;
    }

    // ==================================================
    // 3️⃣ CREATE FMS INSTANCE
    // ==================================================
    $stmt = $pdo->prepare("
        INSERT INTO fms_instances
        (process_id, reference_title, form_data, started_at, status)
        VALUES (?, ?, ?, NOW(), 'running')
    ");
    $stmt->execute([
        $process_id,
        'FORM#' . $submission_id,
        $formDataJson
    ]);

    $instance_id = (int)$pdo->lastInsertId();

    // ==================================================
    // 4️⃣ FETCH PROCESS STEPS
    // ==================================================
    $stmt = $pdo->prepare("
        SELECT id, planned_duration, planned_unit, user_id
        FROM fms_steps
        WHERE process_id = ?
        ORDER BY step_order ASC
    ");
    $stmt->execute([$process_id]);
    $steps = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$steps) {
        throw new Exception("No steps defined for process");
    }

    // ==================================================
    // 5️⃣ CREATE INSTANCE STEPS
    // ==================================================
    $planned_at = new DateTime();

    $stmt = $pdo->prepare("
        INSERT INTO fms_instance_steps
        (instance_id, step_id, assigned_to, planned_at, status)
        VALUES (?, ?, ?, ?, 'pending')
    ");

    foreach ($steps as $step) {
        $stmt->execute([
            $instance_id,
            $step['id'],
            $step['user_id'] ?? null,
            $planned_at->format('Y-m-d H:i:s')
        ]);

        // Move planned date forward
        if ($step['planned_unit'] === 'days') {
            $planned_at->modify('+' . (int)$step['planned_duration'] . ' days');
        } else {
            $planned_at->modify('+' . (int)$step['planned_duration'] . ' hours');
        }
    }

    // ==================================================
    // 6️⃣ API RESPONSE (ONLY FOR DIRECT CALL)
    // ==================================================
    if (!isset($INTERNAL_CALL)) {
        echo json_encode([
            "success"     => true,
            "instance_id" => $instance_id
        ]);
        exit;
    }

} catch (Throwable $e) {
    if (!isset($INTERNAL_CALL)) {
        http_response_code(500);
        echo json_encode([
            "error"   => "FMS_INSTANCE_ERROR",
            "message" => $e->getMessage()
        ]);
        exit;
    }
    throw $e;
}
