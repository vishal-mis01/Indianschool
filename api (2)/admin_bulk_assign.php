<?php
require_once __DIR__ . '/_cors.php';
require "config.php";
require "auth.php";

header("Content-Type: application/json");

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'POST required']);
        exit;
    }

    if (!isset($_FILES['file'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No file uploaded']);
        exit;
    }

    $path = $_FILES['file']['tmp_name'];
    $name = $_FILES['file']['name'];

    // accept CSV or Excel; we will treat as CSV for simplicity
    $ext = pathinfo($name, PATHINFO_EXTENSION);

    $rowCount = 0;
    $stmt = $pdo->prepare("INSERT INTO task_assignments
        (task_template_id, assigned_user_id, assigned_department, start_date, end_date, grace_days, skip_weekdays)
        VALUES (?, ?, ?, ?, ?, ?, ?)");

    if (($handle = fopen($path, 'r')) !== false) {
        // read header row
        $headers = fgetcsv($handle);
        while (($data = fgetcsv($handle)) !== false) {
            $rowCount++;
            // expect columns: template_id,user_id,department,start_date,end_date,grace_days,skip_weekdays
            list($templateId, $userId, $dept, $start, $end, $grace, $skip) = array_pad($data, 7, null);

            // basic cleaning
            $templateId = intval($templateId);
            $userId = $userId !== '' ? intval($userId) : null;
            $dept = $dept ?: null;
            $grace = intval($grace);
            $skip = $skip ?: null;

            // convert date formats if needed (assume YYYY-MM-DD or DD/MM/YYYY)
            $convert = function($d) {
                if (!$d) return null;
                if (preg_match('#^(\d{2})/(\d{2})/(\d{4})$#', $d, $m)) {
                    return "{$m[3]}-{$m[2]}-{$m[1]}";
                }
                return $d;
            };
            $start = $convert($start);
            $end = $convert($end);

            $stmt->execute([
                $templateId,
                $userId,
                $dept,
                $start,
                $end,
                $grace,
                $skip,
            ]);
        }
        fclose($handle);
    } else {
        throw new Exception('Unable to open uploaded file');
    }

    echo json_encode(['success' => true, 'count' => $rowCount]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
