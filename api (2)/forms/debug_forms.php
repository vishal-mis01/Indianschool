<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

try {
    if (!isset($auth_user) || !isset($auth_user['id'])) {
        echo json_encode(["error" => "Not authenticated", "auth_user" => $auth_user]);
        exit;
    }

    $userId = (int)$auth_user['id'];

    // Check all forms
    $stmt = $pdo->prepare("SELECT id, name FROM forms");
    $stmt->execute();
    $allForms = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Check assignments for this user
    $stmt = $pdo->prepare("
        SELECT fa.id, fa.form_id, fa.assigned_to, fa.is_active, f.name 
        FROM forms_assignment fa
        LEFT JOIN forms f ON f.id = fa.form_id
        WHERE fa.assigned_to = ?
    ");
    $stmt->execute([$userId]);
    $userAssignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Check active assignments for this user
    $stmt = $pdo->prepare("
        SELECT fa.id, fa.form_id, fa.assigned_to, fa.is_active, f.name 
        FROM forms_assignment fa
        LEFT JOIN forms f ON f.id = fa.form_id
        WHERE fa.assigned_to = ? AND fa.is_active = 1
    ");
    $stmt->execute([$userId]);
    $activeAssignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "auth_user_id" => $userId,
        "all_forms_count" => count($allForms),
        "all_forms" => $allForms,
        "total_assignments" => count($userAssignments),
        "user_assignments" => $userAssignments,
        "active_assignments" => $activeAssignments
    ]);

} catch (Throwable $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
exit;
