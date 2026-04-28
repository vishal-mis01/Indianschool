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

$form_id = intval($_POST['form_id'] ?? 0);
if ($form_id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "form_id missing"]);
    exit;
}

if (!$auth_user || !isset($auth_user['id'])) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$user_id = (int)$auth_user['id'];
$values  = $_POST['values'] ?? [];

try {
    // ==================================================
    // 1️⃣ CREATE FORM SUBMISSION
    // ==================================================
    $stmt = $pdo->prepare("
        INSERT INTO form_submissions (form_id, user_id, created_at)
        VALUES (?, ?, NOW())
    ");
    $stmt->execute([$form_id, $user_id]);

    $submission_id = (int)$pdo->lastInsertId();

    // ==================================================
    // 2️⃣ SAVE TEXT FIELD VALUES
    // ==================================================
    if (is_array($values) && !empty($values)) {
        $stmt = $pdo->prepare("
            INSERT INTO form_submission_values
            (submission_id, field_id, value)
            VALUES (?, ?, ?)
        ");

        foreach ($values as $field_id => $value) {
            $stmt->execute([
                $submission_id,
                (int)$field_id,
                (string)$value
            ]);
        }
    }

    // ==================================================
    // 3️⃣ SAVE FILE UPLOADS
    // ==================================================
    if (!empty($_FILES['files']) && is_array($_FILES['files']['name'])) {

        // Save to api/uploads/forms/ relative to API directory
        $uploadDir = dirname(__DIR__) . "/uploads/forms/";
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                throw new Exception("Upload directory missing and could not be created: $uploadDir");
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO form_submission_files
            (submission_id, field_id, file_path, latitude, longitude, accuracy, captured_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        foreach ($_FILES['files']['name'] as $field_id => $name) {
            if (empty($name)) continue;

            $tmp = $_FILES['files']['tmp_name'][$field_id];
            $ext = pathinfo($name, PATHINFO_EXTENSION);

            $filename = uniqid('form_', true) . "." . $ext;
            $relativePath = "uploads/forms/" . $filename;
            $absolutePath = $uploadDir . $filename;

            if (!move_uploaded_file($tmp, $absolutePath)) {
                throw new Exception("File upload failed");
            }

            // Get metadata if available
            $latitude = $_POST['metadata'][$field_id]['latitude'] ?? null;
            $longitude = $_POST['metadata'][$field_id]['longitude'] ?? null;
            $accuracy = $_POST['metadata'][$field_id]['accuracy'] ?? null;
            $captured_at = $_POST['metadata'][$field_id]['timestamp'] ?? null;

            $stmt->execute([
                $submission_id,
                (int)$field_id,
                $relativePath,
                $latitude,
                $longitude,
                $accuracy,
                $captured_at
            ]);
        }
    }

    // ==================================================
    // 4️⃣ AUTO CREATE FMS INSTANCE (IF LINKED)
    // ==================================================
    $_POST['submission_id'] = $submission_id;
    $INTERNAL_CALL = true; // Mark as internal call to skip re-authentication
    $fms_instance_id = null;
    $fms_message = "";
    
    try {
        // Check if form is linked to a process
        $stmt = $pdo->prepare("SELECT process_id FROM forms WHERE id = ? LIMIT 1");
        $stmt->execute([$form_id]);
        $formRow = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($formRow && !empty($formRow['process_id'])) {
            require __DIR__ . '/create_instance_from_submission.php';
            $fms_message = "FMS process started";
        } else {
            $fms_message = "Form not linked to FMS process";
        }
    } catch (Throwable $fmsErr) {
        // If FMS instance creation fails, still allow form submission
        error_log("FMS instance creation failed: " . $fmsErr->getMessage());
        $fms_message = "FMS error: " . $fmsErr->getMessage();
    }

    // ==================================================
    // 5️⃣ FINAL RESPONSE
    // ==================================================
    http_response_code(201);
    echo json_encode([
        "success" => true,
        "submission_id" => $submission_id,
        "fms_status" => $fms_message ?? "N/A"
    ]);
    exit;

} catch (Throwable $e) {
    error_log("Form submission error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "error"   => "SERVER_ERROR",
        "message" => $e->getMessage()
    ]);
    exit;
}
