<?php
require_once __DIR__ . '/../config.php';

header("Content-Type: application/json");

try {
    $form_id = intval($_GET['form_id'] ?? 0);
    
    if ($form_id <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Form ID required"]);
        exit;
    }

    // Get form
    $stmt = $pdo->prepare("SELECT id, name FROM forms WHERE id = ?");
    $stmt->execute([$form_id]);
    $form = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$form) {
        http_response_code(404);
        echo json_encode(["error" => "Form not found"]);
        exit;
    }

    // Get all submissions
    $stmt = $pdo->prepare("
        SELECT
            fs.id,
            fs.user_id,
            u.name as user_name,
            u.email as user_email,
            fs.created_at,
            COUNT(fsv.id) as field_count
        FROM form_submissions fs
        LEFT JOIN users u ON fs.user_id = u.id
        LEFT JOIN form_submission_values fsv ON fs.id = fsv.submission_id
        WHERE fs.form_id = ?
        GROUP BY fs.id
        ORDER BY fs.created_at DESC
    ");
    $stmt->execute([$form_id]);
    $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get fields for display
    $stmt = $pdo->prepare("
        SELECT id, label FROM form_fields
        WHERE form_id = ?
        ORDER BY field_order ASC
    ");
    $stmt->execute([$form_id]);
    $fields = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "form" => $form,
        "submissions" => $submissions,
        "fields" => $fields
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>
