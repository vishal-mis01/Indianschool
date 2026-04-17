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

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$class_id = intval($input['class_id'] ?? 0);
$attendance_date = trim($input['attendance_date'] ?? '');
$students = $input['students'] ?? [];
$remarks = trim($input['remarks'] ?? '');

if ($class_id <= 0 || empty($attendance_date) || !is_array($students) || count($students) === 0) {
    http_response_code(400);
    echo json_encode(["error" => "class_id, attendance_date and students are required"]);
    exit;
}

$dateInput = DateTime::createFromFormat('d/m/Y', $attendance_date);
if (!$dateInput) {
    http_response_code(400);
    echo json_encode(["error" => "attendance_date must be in DD/MM/YYYY format"]);
    exit;
}

$attendance_date_sql = $dateInput->format('Y-m-d');
$user_id = (int)$auth_user['id'];

try {
    if (($auth_user['role'] ?? '') !== 'admin') {
        $verify = $pdo->prepare(
            "SELECT 1 FROM user_class_subjects ucs
             JOIN class_subjects cs ON ucs.class_subject_id = cs.class_subject_id
             WHERE ucs.user_id = ? AND cs.class_id = ?
             LIMIT 1"
        );
        $verify->execute([$user_id, $class_id]);
        if (!$verify->fetch()) {
            http_response_code(403);
            echo json_encode(["error" => "Forbidden"]);
            exit;
        }
    }

    $pdo->beginTransaction();

    $studentStmt = $pdo->prepare(
        "SELECT 1 FROM class_students WHERE class_id = ? AND user_id = ? LIMIT 1"
    );
    $attendanceSelect = $pdo->prepare(
        "SELECT id FROM attendance WHERE class_id = ? AND student_user_id = ? AND attendance_date = ? LIMIT 1"
    );
    $attendanceUpdate = $pdo->prepare(
        "UPDATE attendance
         SET status = ?, remarks = ?, teacher_user_id = ?, updated_at = NOW()
         WHERE id = ?"
    );
    $attendanceInsert = $pdo->prepare(
        "INSERT INTO attendance
         (class_id, student_user_id, teacher_user_id, attendance_date, status, remarks, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())"
    );

    foreach ($students as $student) {
        $student_id = intval($student['student_id'] ?? 0);
        $status = trim($student['status'] ?? '');

        if ($student_id <= 0 || $status === '') {
            continue;
        }

        $studentStmt->execute([$class_id, $student_id]);
        if (!$studentStmt->fetch()) {
            continue;
        }

        $attendanceSelect->execute([$class_id, $student_id, $attendance_date_sql]);
        $existing = $attendanceSelect->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $attendanceUpdate->execute([$status, $remarks, $user_id, (int)$existing['id']]);
        } else {
            $attendanceInsert->execute([$class_id, $student_id, $user_id, $attendance_date_sql, $status, $remarks]);
        }
    }

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Attendance recorded successfully."]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["error" => "Database error", "details" => $e->getMessage()]);
}
