<?php
require_once __DIR__ . '/_cors.php';
require 'config.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");


/*
Expected POST (x-www-form-urlencoded):
- admin_id
- name
- email
- department
- role (optional, default 'user'; can be 'user' or 'process_coordinator')
*/


if (
    !isset($_POST['admin_id']) ||
    !isset($_POST['name']) ||
    !isset($_POST['email']) ||
    !isset($_POST['department'])
) {
    echo json_encode(["error" => "Invalid request"]);
    exit;
}


$adminId = intval($_POST['admin_id']);
$name = trim($_POST['name']);
$email = trim($_POST['email']);
$department = trim($_POST['department']);
$role = isset($_POST['role']) && in_array($_POST['role'], ['user', 'process_coordinator']) ? $_POST['role'] : 'user';

// 1️⃣ Verify admin
$stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'admin'");
$stmt->execute([$adminId]);

if (!$stmt->fetch()) {
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// 2️⃣ Check if email already exists
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);

if ($stmt->fetch()) {
    echo json_encode(["error" => "Email already exists"]);
    exit;
}

// 3️⃣ Generate random password
$plainPassword = substr(str_shuffle("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"), 0, 8);
$passwordHash = password_hash($plainPassword, PASSWORD_DEFAULT);


// 4️⃣ Insert user
$stmt = $pdo->prepare("
    INSERT INTO users (name, email, password_hash, department, role)
    VALUES (?, ?, ?, ?, ?)
");
$stmt->execute([$name, $email, $passwordHash, $department, $role]);

echo json_encode([
    "success" => true,
    "password" => $plainPassword
]);
