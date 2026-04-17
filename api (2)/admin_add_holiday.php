<?php
require "config.php";
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$raw = file_get_contents("php://input");
parse_str($raw, $data);

$date = $data["holiday_date"] ?? null;
$desc = $data["description"] ?? null;

// Validate date format: YYYY-MM-DD
if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid holiday date format. Expected: YYYY-MM-DD"]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO holidays (holiday_date, description)
        VALUES (?, ?)
    ");
    $stmt->execute([$date, $desc]);

    echo json_encode(["success" => true]);
} catch (PDOException $e) {
    if ($e->getCode() == "23000") {
        http_response_code(409);
        echo json_encode(["error" => "Holiday already exists"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
