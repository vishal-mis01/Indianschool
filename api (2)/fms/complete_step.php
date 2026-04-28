
<?php
// Always require config.php first for global CORS and JSON headers
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

if (!isset($auth_user)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// Accept both POST data and JSON body
$data = $_POST;
$content_type = $_SERVER['CONTENT_TYPE'] ?? '';

if (empty($data) && (strpos($content_type, 'application/json') !== false)) {
    $json = json_decode(file_get_contents("php://input"), true);
    $data = $json ?? [];
}

$step_id = $data['step_id'] ?? null;

if (!$step_id) {
    http_response_code(400);
    echo json_encode([
        "error" => "Missing step_id",
        "received_keys" => array_keys($data),
        "content_type" => $content_type
    ]);
    exit;
}

$stmt = $pdo->prepare("
UPDATE fms_instance_steps
SET status = 'complete', actual_at = NOW()
WHERE id = ? AND assigned_to = ?
");

$success = $stmt->execute([$step_id, $auth_user['id']]);

if ($stmt->rowCount() === 0) {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Step not found or not assigned to you"
    ]);
    exit;
}

// Get the instance_id for this step
$instanceStmt = $pdo->prepare("SELECT instance_id FROM fms_instance_steps WHERE id = ?");
$instanceStmt->execute([$step_id]);
$stepData = $instanceStmt->fetch(PDO::FETCH_ASSOC);

if ($stepData) {
    $instance_id = $stepData['instance_id'];
    
    // Check if all steps are now complete
    $checkStmt = $pdo->prepare("
    SELECT COUNT(*) as incomplete FROM fms_instance_steps
    WHERE instance_id = ? AND status != 'complete'
    ");
    $checkStmt->execute([$instance_id]);
    $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    // If no incomplete steps, mark instance as complete
    if ($result['incomplete'] == 0) {
        $updateInstanceStmt = $pdo->prepare("
        UPDATE fms_instances
        SET status = 'complete', completed_at = NOW()
        WHERE id = ?
        ");
        $updateInstanceStmt->execute([$instance_id]);
    }
}

echo json_encode(["success" => true]);
