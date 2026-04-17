<?php
require 'config.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");


if (
    !isset($_POST['name']) ||
    !isset($_POST['email']) ||
    !isset($_POST['password']) ||
    !isset($_POST['department'])
) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid request"]);
    exit;
}

try {

    $name = trim($_POST['name']);
    $email = trim($_POST['email']);
    $password = $_POST['password'];
    $department = trim($_POST['department']);
    $role = isset($_POST['role']) && in_array($_POST['role'], ['user', 'process_coordinator']) ? $_POST['role'] : 'user';

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);

    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["error" => "Email already registered"]);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);


    $stmt = $pdo->prepare("
        INSERT INTO users (name, email, password_hash, department, role)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$name, $email, $passwordHash, $department, $role]);

    http_response_code(201);
    echo json_encode(["success" => true]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "Registration failed", "details" => $e->getMessage()]);
    exit;
}
