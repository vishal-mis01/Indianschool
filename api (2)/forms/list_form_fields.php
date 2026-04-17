<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

// SAFETY: never echo HTML
try {

    $form_id = intval($_GET['form_id'] ?? 0);

    if ($form_id <= 0) {
        echo json_encode([]);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT
            id,
            label,
            field_type,
            is_required
        FROM form_fields
        WHERE form_id = ?
        ORDER BY id ASC
    ");

    $stmt->execute([$form_id]);

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($rows);
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "SERVER_ERROR",
        "message" => $e->getMessage()
    ]);
    exit;
}
