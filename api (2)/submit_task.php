<?php
require "config.php";
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false]);
    exit;
}

try {
    $user_id = intval($_POST["user_id"] ?? 0);
    $task_template_id = intval($_POST["task_template_id"] ?? 0);
    $assignment_id = intval($_POST["assignment_id"] ?? 0);
    $task_date = $_POST["task_date"] ?? null;
    $status = $_POST["status"] ?? "done"; // Default to 'done', but allow 'na'

    if (!$user_id || (!$task_template_id && !$assignment_id) || !$task_date) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        exit;
    }

    // Validate status
    if (!in_array($status, ['done', 'na'])) {
        echo json_encode(["success" => false, "error" => "Invalid status. Must be 'done' or 'na'"]);
        exit;
    }

    /* check requires photo using template id (prefer the template if provided) */
    $tpl_id_for_check = $task_template_id ?: null;
    if ($assignment_id && !$tpl_id_for_check) {
        // try to resolve template id from assignment
        $q = $pdo->prepare("SELECT task_template_id FROM task_assignments WHERE id = ? LIMIT 1");
        $q->execute([$assignment_id]);
        $row = $q->fetch();
        if ($row) $tpl_id_for_check = intval($row['task_template_id']);
    }

    if ($tpl_id_for_check) {
        $q = $pdo->prepare("SELECT requires_photo FROM task_templates WHERE id = ?");
        $q->execute([$tpl_id_for_check]);
        $tpl = $q->fetch();
        if (!$tpl) {
            echo json_encode(["success" => false, "error" => "Task template not found"]);
            exit;
        }

        // Only require photo for 'done' tasks, not for 'na' tasks
        if ($tpl["requires_photo"] == 1 && $status === 'done' && empty($_FILES["photo"])) {
            echo json_encode(["success" => false, "error" => "Photo required"]);
            exit;
        }
    }

    $photo_path = null;
    if (!empty($_FILES["photo"])) {
        try {
            $upload_dir = __DIR__ . "/../uploads/";
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0777, true);
            }

            $name = uniqid("task_", true) . "_" . basename($_FILES["photo"]["name"]);
            $dest = $upload_dir . $name;

            if (!move_uploaded_file($_FILES["photo"]["tmp_name"], $dest)) {
                throw new Exception("Failed to move uploaded file");
            }

            $photo_path = "uploads/" . $name;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Photo upload failed: " . $e->getMessage()]);
            exit;
        }
    }

    /* prevent duplicates - prefer assignment_id if provided */
    if ($assignment_id) {
        $chk = $pdo->prepare("
            SELECT id FROM task_submissions
            WHERE user_id = ? AND assignment_id = ? AND task_date = ?
            LIMIT 1
        ");
        $chk->execute([$user_id, $assignment_id, $task_date]);
    } else {
        $chk = $pdo->prepare("
            SELECT id FROM task_submissions
            WHERE user_id = ? AND task_template_id = ? AND task_date = ?
            LIMIT 1
        ");
        $chk->execute([$user_id, $task_template_id, $task_date]);
    }

    if ($chk->fetch()) {
        echo json_encode(["success" => false, "error" => "Already submitted"]);
        exit;
    }

    /* save */
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
    INSERT INTO task_submissions
    (user_id, task_template_id, assignment_id, task_date, status, completed_at, photo_path)
    VALUES (?, ?, ?, ?, ?, NOW(), ?)
    ");
    $stmt->execute([
        $user_id,
        $task_template_id ?: null,
        $assignment_id ?: null,
        $task_date,
        $status,
        $photo_path
    ]);

    $pdo->commit();

    echo json_encode(["success" => true]);
    exit;
} catch (Exception $e) {
    if (isset($pdo)) {
        try {
            $pdo->rollBack();
        } catch (Exception $e2) {}
    }
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
    exit;
}
