<?php
require "config.php";

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

try {
        $debug = [];
    $user_id = intval($_GET["user_id"] ?? 0);
    $role = $_GET["role"] ?? "user";
    $debug[] = [ 'user_id' => $user_id, 'role' => $role ];
    if ($user_id === 0) {
        http_response_code(400);
        echo json_encode([
            'tasks' => [],
            'debug' => [ 'error' => 'Missing or invalid user_id', 'user_id' => $user_id ]
        ]);
        exit;
    }

    $today = date("Y-m-d");
    $weekday = date("N"); // 1–7
    $todayDayOfWeek = date("w", strtotime($today)); // 0 = Sunday, 6 = Saturday
    $todayDateOfMonth = date("d");
    $todayMonthDay = date("m-d");
    $currentYear = date("Y");
    $currentWeek = date("W");
    $currentMonth = date("Y-m");

    /* user department */
    $dept = null;
    $stmt = $pdo->prepare("SELECT department FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $dept = $row["department"];
    }
    $debug[] = [ 'department' => $dept ];

    /* holiday check */
    $h = $pdo->prepare("SELECT 1 FROM holidays WHERE holiday_date = ? LIMIT 1");
    $h->execute([$today]);
    if ($h->fetch()) {
        http_response_code(200);
        echo json_encode([
            'tasks' => [],
            'debug' => [ 'error' => 'Today is a holiday', 'date' => $today ]
        ]);
        exit;
    }

    /* fetch assignments */
    if ($role === "process_coordinator") {
        $sql = "
        SELECT
            ta.id AS assignment_id,
            ta.task_template_id,
            ta.start_date,
            ta.end_date,
            ta.grace_days,
            ta.skip_weekdays,
            ta.assigned_user_id,
            ta.assigned_department,
            u.name AS user_name,
            tt.title,
            tt.frequency,
            tt.requires_photo
        FROM task_assignments ta
        JOIN task_templates tt ON tt.id = ta.task_template_id
        LEFT JOIN users u ON ta.assigned_user_id = u.id
        WHERE
            DATE(ta.start_date) <= ?
            AND (ta.end_date IS NULL OR DATE(ta.end_date) >= ?)
        ";
        $debug[] = [ 'sql' => $sql, 'params' => [ $today, $today ] ];
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $today,
            $today
        ]);
    } else {
        $sql = "
        SELECT
            ta.id AS assignment_id,
            ta.task_template_id,
            ta.start_date,
            ta.end_date,
            ta.grace_days,
            ta.skip_weekdays,
            ta.assigned_user_id,
            ta.assigned_department,
            u.name AS user_name,
            tt.title,
            tt.frequency,
            tt.requires_photo
        FROM task_assignments ta
        JOIN task_templates tt ON tt.id = ta.task_template_id
        LEFT JOIN users u ON ta.assigned_user_id = u.id
        WHERE
            DATE(ta.start_date) <= ?
            AND (ta.end_date IS NULL OR DATE(ta.end_date) >= ?)
            AND (
                ta.assigned_user_id = ?
                OR (ta.assigned_user_id IS NULL AND ta.assigned_department = ?)
            )
        ";
        $debug[] = [ 'sql' => $sql, 'params' => [ $today, $today, $user_id, $dept ] ];
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $today,
            $today,
            $user_id,
            $dept
        ]);
    }

$tasks = [];

while ($t = $stmt->fetch(PDO::FETCH_ASSOC)) {

    $reason = '';
    $debug[] = [ 'raw_assignment' => $t ];

    // skip weekdays (applies to all roles)
    if (!empty($t["skip_weekdays"])) {
        $skip = json_decode($t["skip_weekdays"], true);
        if (is_array($skip) && in_array($weekday, $skip)) {
            $reason = 'skip_weekdays';
            $debug[] = [ 'assignment' => $t, 'skipped' => true, 'reason' => $reason ];
            continue;
        }
    }

    // frequency recurrence check (show task on recurring schedule based on start_date)
    // Daily: every day
    // Weekly: same day of week as start_date
    // Monthly: same date of month as start_date
    // Yearly: same month-day as start_date
    $show = false;
    switch ($t["frequency"]) {
        case "D": // Daily
            $show = true;
            break;
        case "W": // Weekly - same day of week as start_date
            if (date("w", strtotime($t["start_date"])) === date("w", strtotime($today))) {
                $show = true;
            }
            break;
        case "M": // Monthly - same date as start_date
            if (date("d", strtotime($t["start_date"])) === date("d", strtotime($today))) {
                $show = true;
            }
            break;
        case "Y": // Yearly - same month-day as start_date
            if (date("m-d", strtotime($t["start_date"])) === date("m-d", strtotime($today))) {
                $show = true;
            }
            break;
        default:
            $show = true; // unknown frequency, show
    }
    if (!$show) {
        $reason = 'frequency_schedule';
        $debug[] = [ 'assignment' => $t, 'skipped' => true, 'reason' => $reason ];
        continue;
    }

    // grace days (ignore for process coordinator)
    if ($role !== "process_coordinator" && $t["grace_days"] > 0) {
        $grace_end = date(
            "Y-m-d",
            strtotime("+{$t['grace_days']} days", strtotime($t["start_date"]))
        );
        if ($today > $grace_end) {
            $reason = 'grace_days';
            $debug[] = [ 'assignment' => $t, 'skipped' => true, 'reason' => $reason ];
            continue;
        }
    }

    // already submitted (check based on frequency)
    $submit_check_passed = false;
    $is_completed = false;
    
    if ($role === "process_coordinator") {
        // For PC: check if this specific assignment has been submitted today (exclude NA tasks)
        $chk = $pdo->prepare("
            SELECT id, status FROM task_submissions
            WHERE assignment_id = ? AND task_date = ? AND status != 'na'
            LIMIT 1
        ");
        $chk->execute([
            $t["assignment_id"],
            $today
        ]);
        $submission = $chk->fetch(PDO::FETCH_ASSOC);
        $is_completed = !!$submission;
        $submit_check_passed = true; // Always show for PC, mark as completed or pending
    } else {
        // For regular users: check based on frequency (exclude NA tasks)
        $chk = $pdo->prepare("
            SELECT task_date FROM task_submissions
            WHERE user_id = ? AND task_template_id = ? AND status != 'na'
            ORDER BY task_date DESC
            LIMIT 1
        ");
        $chk->execute([
            $user_id,
            $t["task_template_id"]
        ]);
        $last_submission = $chk->fetch(PDO::FETCH_ASSOC);
        
        if (!$last_submission) {
            // No submission yet
            $submit_check_passed = true;
        } else {
            $lastDate = $last_submission["task_date"];
            switch ($t["frequency"]) {
                case "D": // Daily - check if submitted today
                    $submit_check_passed = ($lastDate !== $today);
                    break;
                case "W": // Weekly - check if submitted this week
                    $lastWeek = date("W", strtotime($lastDate));
                    $thisWeek = date("W", strtotime($today));
                    $lastYear = date("Y", strtotime($lastDate));
                    $thisYear = date("Y", strtotime($today));
                    $submit_check_passed = !($lastWeek === $thisWeek && $lastYear === $thisYear);
                    break;
                case "M": // Monthly - check if submitted this month
                    $lastMonth = date("Y-m", strtotime($lastDate));
                    $thisMonth = date("Y-m", strtotime($today));
                    $submit_check_passed = ($lastMonth !== $thisMonth);
                    break;
                case "Y": // Yearly - check if submitted this year
                    $lastYear = date("Y", strtotime($lastDate));
                    $thisYear = date("Y", strtotime($today));
                    $submit_check_passed = ($lastYear !== $thisYear);
                    break;
                default:
                    $submit_check_passed = true; // unknown frequency
            }
        }
    }
    
    if (!$submit_check_passed) {
        $reason = 'already_submitted';
        $debug[] = [ 'assignment' => $t, 'skipped' => true, 'reason' => $reason ];
        continue;
    }

    $tasks[] = [
        "assignment_id"  => $t["assignment_id"],
        "task_id"        => $t["task_template_id"],
        "user_name"      => $t["user_name"] ?? ($t["assigned_user_id"] ? $t["assigned_user_id"] : $t["assigned_department"]),
        "title"          => $t["title"],
        "frequency"      => $t["frequency"],
        "requires_photo" => (int)$t["requires_photo"],
        "scheduled_date" => $today,
        "status"         => $is_completed ? "completed" : "pending"
    ];
    $debug[] = [ 'assignment' => $t, 'skipped' => false, 'reason' => 'included' ];
}

    http_response_code(200);
    echo json_encode([
        'tasks' => $tasks,
        'debug' => $debug
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Failed to fetch checklist",
        "details" => $e->getMessage(),
        "debug" => [
            "exception" => get_class($e),
            "message" => $e->getMessage(),
            "file" => $e->getFile(),
            "line" => $e->getLine(),
            "trace" => $e->getTraceAsString()
        ]
    ]);
    exit;
}
