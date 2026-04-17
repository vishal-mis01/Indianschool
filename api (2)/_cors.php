<?php
// Allow frontend origin
$allowedOrigins = [
    'http://localhost:8081',
    'http://localhost:8087',
    'http://localhost:8088',
    'https://indiangroupofschools.com',
    'https://www.indiangroupofschools.com'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
}
header("Access-Control-Allow-Credentials: true");

// Allow headers your app uses
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Allow methods
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

// JSON response
header("Content-Type: application/json");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}