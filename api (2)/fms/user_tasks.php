<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");

/* ===== CORS ===== */
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = [
    'http://localhost:8081',
    'http://localhost:8087',
    'http://localhost:8088',
    'https://indiangroupofschools.com'
];
if (in_array($origin, $allowed)) {
    header("Access-Control-Allow-Origin: $origin");
}
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
/* ================= */

$user_id = $auth_user['id']; // ✅ CORRECT SOURCE

try {

    $sql = "
        SELECT
            ist.id AS step_id,
            ist.instance_id,
            fi.reference_title,
            fi.form_data,
            fp.name AS process_name,
            fs.step_name,
            ist.planned_at,
            ist.actual_at,
            ist.upload_path,
            fs.requires_upload,
            (
                SELECT COUNT(*)
                FROM fms_instance_steps p
                JOIN fms_steps ps ON ps.id = p.step_id
                WHERE p.instance_id = ist.instance_id
                  AND ps.step_order < fs.step_order
                  AND p.status = 'pending'
            ) AS locked_count
        FROM fms_instance_steps ist
        JOIN fms_steps fs ON fs.id = ist.step_id
        JOIN fms_instances fi ON fi.id = ist.instance_id
        JOIN fms_processes fp ON fp.id = fi.process_id
        WHERE ist.assigned_to = :user_id
          AND ist.status = 'pending'
        ORDER BY ist.planned_at ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':user_id' => $user_id]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch all field mappings (ID -> Label)
    $fieldStmt = $pdo->prepare("SELECT id, label FROM form_fields");
    $fieldStmt->execute();
    $fieldMap = [];
    while ($field = $fieldStmt->fetch(PDO::FETCH_ASSOC)) {
        $fieldMap[$field['id']] = $field['label'];
    }

    // Convert field IDs to field names in form_data
    foreach ($rows as &$r) {
        $r['is_locked'] = ((int)$r['locked_count']) > 0;
        unset($r['locked_count']);
        
        // Convert form_data field IDs to field labels
        if ($r['form_data']) {
            $formData = json_decode($r['form_data'], true);
            if (is_array($formData) && !empty($formData)) {
                $newFormData = [];
                foreach ($formData as $fieldId => $value) {
                    // Try to find label, use ID as fallback
                    $fieldLabel = isset($fieldMap[$fieldId]) ? $fieldMap[$fieldId] : 
                                 (isset($fieldMap[(int)$fieldId]) ? $fieldMap[(int)$fieldId] : $fieldId);
                    $newFormData[$fieldLabel] = $value;
                }
                $r['form_data'] = json_encode($newFormData);
            }
        }
    }

    echo json_encode($rows);
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Server error",
        "details" => $e->getMessage()
    ]);
    exit;
}
