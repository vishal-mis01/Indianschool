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

if (!$auth_user || !isset($auth_user['id'])) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$user_id = (int)$auth_user['id'];

$starting_kms = $_POST['starting_kms'] ?? '';
$ending_kms = $_POST['ending_kms'] ?? '';
$total_kms = $_POST['total_kms'] ?? '';

if (empty($starting_kms) || empty($ending_kms) || empty($total_kms)) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required fields: starting_kms, ending_kms, total_kms"]);
    exit;
}

$latitude = $_POST['latitude'] ?? null;
$longitude = $_POST['longitude'] ?? null;
$location_accuracy = $_POST['location_accuracy'] ?? null;
$location_timestamp = $_POST['location_timestamp'] ?? null;
$photo_timestamp = $_POST['photo_timestamp'] ?? null;

try {
    $pdo->beginTransaction();

    // Insert travel record
    $stmt = $pdo->prepare("
        INSERT INTO travel_records
        (user_id, starting_kms, ending_kms, total_kms, latitude, longitude, location_accuracy, location_timestamp, photo_timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $user_id,
        $starting_kms,
        $ending_kms,
        $total_kms,
        $latitude,
        $longitude,
        $location_accuracy,
        $location_timestamp,
        $photo_timestamp
    ]);

    $travel_id = (int)$pdo->lastInsertId();

    // Handle photo upload
    $photo_path = null;
    if (!empty($_FILES['photo']['name'])) {
        $uploadDir = __DIR__ . '/../uploads/travel/';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                throw new Exception("Upload directory missing and could not be created: $uploadDir");
            }
        }

        $tmp = $_FILES['photo']['tmp_name'];
        $name = $_FILES['photo']['name'];
        $ext = pathinfo($name, PATHINFO_EXTENSION);

        $filename = 'travel_' . $travel_id . '_' . uniqid() . '.' . $ext;
        $absolutePath = $uploadDir . $filename;
        $relativePath = 'uploads/travel/' . $filename;

        if (!move_uploaded_file($tmp, $absolutePath)) {
            throw new Exception("Photo upload failed");
        }

        $photo_path = $relativePath;

        // Update the record with photo path
        $stmt = $pdo->prepare("UPDATE travel_records SET photo_path = ? WHERE id = ?");
        $stmt->execute([$photo_path, $travel_id]);
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "Travel record submitted successfully",
        "travel_id" => $travel_id
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>