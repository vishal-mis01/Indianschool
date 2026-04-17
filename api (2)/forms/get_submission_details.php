<?php
require_once __DIR__ . '/../config.php';

header("Content-Type: application/json");

try {
    $submission_id = intval($_GET['submission_id'] ?? 0);
    
    if ($submission_id <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Submission ID required"]);
        exit;
    }

    // Get submission details
    $stmt = $pdo->prepare("
        SELECT
            fs.id, fs.form_id, fs.user_id, fs.created_at,
            u.name as user_name, u.email as user_email
        FROM form_submissions fs
        LEFT JOIN users u ON fs.user_id = u.id
        WHERE fs.id = ?
    ");
    $stmt->execute([$submission_id]);
    $submission = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$submission) {
        http_response_code(404);
        echo json_encode(["error" => "Submission not found"]);
        exit;
    }

    // Get all field values for this submission
    $stmt = $pdo->prepare("
        SELECT
            fsv.field_id,
            fsv.value,
            ff.label,
            ff.field_type
        FROM form_submission_values fsv
        JOIN form_fields ff ON fsv.field_id = ff.id
        WHERE fsv.submission_id = ?
        ORDER BY ff.field_order ASC
    ");
    $stmt->execute([$submission_id]);
    $values = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "submission" => $submission,
        "values" => $values
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>
