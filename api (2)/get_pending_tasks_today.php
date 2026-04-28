<?php
require_once __DIR__ . '/_cors.php';
require "config.php";
require "auth.php";

header("Content-Type: application/json");

try {
    $today = date("Y-m-d");
    $todayDayOfWeek = date("w", strtotime($today)); // 0 = Sunday, 6 = Saturday
    $todayDateOfMonth = date("d");
    $todayMonthDay = date("m-d");
    $currentYear = date("Y");
    $currentWeek = date("W");
    $currentMonth = date("Y-m");
    
    // Query for pending tasks based on their frequency and start_date recurrence pattern
    // Yearly: same month-day as start_date
    // Weekly: same day of week as start_date
    // Monthly: same date of month as start_date
    $sql = "
    SELECT 
        ta.id as assignment_id,
        ta.task_template_id,
        ta.assigned_user_id as user_id,
        u.name as user_name,
        u.department,
        tt.title as task_title,
        tt.frequency,
        ta.start_date,
        ta.end_date,
        ta.grace_days,
        CASE 
            WHEN DATE(ta.end_date) < ? THEN DATEDIFF(?, DATE(ta.end_date))
            ELSE 0
        END as days_overdue,
        COALESCE(ts.status, 'pending') as submission_status
    FROM task_assignments ta
    JOIN task_templates tt ON tt.id = ta.task_template_id
    LEFT JOIN users u ON u.id = ta.assigned_user_id
    LEFT JOIN task_submissions ts ON ts.assignment_id = ta.id 
        AND ts.status = 'done'
        AND (
            (tt.frequency = 'daily' AND DATE(ts.task_date) = ?)
            OR (tt.frequency = 'weekly' AND WEEK(ts.task_date) = ? AND YEAR(ts.task_date) = ?)
            OR (tt.frequency = 'monthly' AND DATE_FORMAT(ts.task_date, '%Y-%m') = ?)
            OR (tt.frequency = 'yearly' AND YEAR(ts.task_date) = ?)
        )
    WHERE ta.assigned_user_id = ?
    AND DATE(ta.start_date) <= ?
    AND (DATE(ta.end_date) >= ? OR ta.end_date IS NULL)
    AND (ts.id IS NULL OR ts.status IS NULL)
    AND (
        (tt.frequency = 'daily')
        OR (tt.frequency = 'weekly' AND DAYOFWEEK(ta.start_date) = DAYOFWEEK(?))
        OR (tt.frequency = 'monthly' AND DAY(ta.start_date) = DAY(?))
        OR (tt.frequency = 'yearly' AND DATE_FORMAT(ta.start_date, '%m-%d') = ?)
    )
    ORDER BY ta.end_date ASC, u.name ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $today,              // For DATEDIFF comparison
        $today,              // For DATEDIFF calculation
        $today,              // daily: check if submitted today
        $currentWeek,        // weekly: check if submitted this week (week number)
        $currentYear,        // weekly: check if submitted this year
        $currentMonth,       // monthly: check if submitted this month (YYYY-MM)
        $currentYear,        // yearly: check if submitted this year
        $userId,             // assigned user (authenticated user only)
        $today,              // start_date check
        $today,              // end_date check
        $today,              // weekly: day of week comparison
        $today,              // monthly: date of month comparison
        $todayMonthDay,      // yearly: month-day comparison (MM-DD)
    ]);
    
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the response
    $data = [];
    foreach ($tasks as $task) {
        $data[] = [
            'assignment_id' => $task['assignment_id'],
            'task_template_id' => $task['task_template_id'],
            'user_id' => $task['user_id'],
            'user_name' => $task['user_name'],
            'department' => $task['department'],
            'task_title' => $task['task_title'],
            'frequency' => $task['frequency'],
            'due_date' => $task['end_date'] ? date('Y-m-d', strtotime($task['end_date'])) : $today,
            'days_overdue' => (int)$task['days_overdue'],
            'submission_status' => $task['submission_status'],
        ];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $data,
        'count' => count($data),
        'date' => $today,
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
?>
