<?php
require_once __DIR__ . "/config.php";
require_once __DIR__ . "/auth.php";

header("Content-Type: application/json");

try {
	// Auth is now required - $auth_user is set by auth.php
	$user_id = $auth_user['id'];

	// get user department (for assigned_department matching)
	$dept = null;
	$uStmt = $pdo->prepare("SELECT department, name, id FROM users WHERE id = ? LIMIT 1");
	$uStmt->execute([$user_id]);
	$user = $uStmt->fetch(PDO::FETCH_ASSOC) ?: null;
	if ($user) $dept = $user['department'];

	// build last 8 weeks (Mon-Sun) including current week
	$weeks = [];
	$now = time();
	// find monday of current week
	$monday = strtotime('monday this week', $now);
	for ($i = 7; $i >= 0; $i--) {
		$start = strtotime("-{$i} week", $monday);
		$end = strtotime("+6 days", $start);
		$weeks[] = [
			'start' => date('Y-m-d', $start),
			'end' => date('Y-m-d', $end),
			'label' => date('d M', $start) . ' - ' . date('d M', $end)
		];
	}

	// prepared statements
	$holidayStmt = $pdo->prepare("SELECT 1 FROM holidays WHERE holiday_date = ? LIMIT 1");
	$assignStmt = $pdo->prepare(
		"SELECT ta.id, ta.task_template_id, ta.start_date, ta.end_date, ta.grace_days, ta.skip_weekdays, tt.frequency
		 FROM task_assignments ta
		 JOIN task_templates tt ON tt.id = ta.task_template_id
		 WHERE (ta.assigned_user_id = ? OR (ta.assigned_user_id IS NULL AND ta.assigned_department = ?))
		   AND DATE(ta.start_date) <= ?
		   AND (ta.end_date IS NULL OR DATE(ta.end_date) >= ?)");

	$submissionStmt = $pdo->prepare(
		"SELECT completed_at, status FROM task_submissions
		 WHERE user_id = ? AND task_date = ? AND (assignment_id = ? OR task_template_id = ?) AND status IN ('done', 'na')
		 ORDER BY completed_at ASC LIMIT 1"
	);

	$fmsStmt = $pdo->prepare(
		"SELECT
			COUNT(*) AS planned,
			SUM(CASE WHEN actual_at IS NOT NULL THEN 1 ELSE 0 END) AS completed,
			SUM(CASE WHEN actual_at IS NOT NULL AND actual_at <= planned_at THEN 1 ELSE 0 END) AS on_time
		 FROM fms_instance_steps
		 WHERE assigned_to = ? AND DATE(planned_at) BETWEEN ? AND ?"
	);

	$weeklyReports = [];

	foreach ($weeks as $week) {
		$planned = 0;
		$actual = 0;
		$onTime = 0;
		$late = 0;

		// iterate days in week
		$startTs = strtotime($week['start']);
		for ($d = 0; $d < 7; $d++) {
			$day = date('Y-m-d', strtotime("+{$d} days", $startTs));
			$weekday = intval(date('N', strtotime($day))); // 1-7

			// holiday skip
			$holidayStmt->execute([$day]);
			if ($holidayStmt->fetch()) continue;

			// fetch assignments active on this day
			$assignStmt->execute([$user_id, $dept, $day, $day]);
			while ($ta = $assignStmt->fetch(PDO::FETCH_ASSOC)) {
				// skip weekdays
				if (!empty($ta['skip_weekdays'])) {
					$skip = json_decode($ta['skip_weekdays'], true);
					if (is_array($skip) && in_array($weekday, $skip)) continue;
				}

				// frequency-based rough filter (accept all frequencies for report accuracy)
				$planned++;

				// find earliest submission for this assignment/date
				$submissionStmt->execute([$user_id, $day, $ta['id'], $ta['task_template_id']]);
				$s = $submissionStmt->fetch(PDO::FETCH_ASSOC);
				if ($s && !empty($s['completed_at'])) {
					$actual++;
					$completedAt = $s['completed_at'];

					// scheduled time: use time portion of assignment start_date if available
					$scheduledTime = date('H:i:s', strtotime($ta['start_date']));
					$scheduledDateTime = $day . ' ' . $scheduledTime;

					if (strtotime($completedAt) <= strtotime($scheduledDateTime)) {
						$onTime++;
					} else {
						$late++;
					}
				}
			}
		}

		$completionPercent = $planned > 0 ? round(($actual / $planned) * 100) : 0;
		$onTimePercent = $planned > 0 ? round(($onTime / $planned) * 100) : 0;

		// FMS summary for the week
		$fms_planned = 0;
		$fms_completed = 0;
		$fms_on_time = 0;
		try {
			$fmsStmt->execute([$user_id, $week['start'], $week['end']]);
			$fms = $fmsStmt->fetch(PDO::FETCH_ASSOC) ?: null;
			if ($fms) {
				$fms_planned = intval($fms['planned']);
				$fms_completed = intval($fms['completed']);
				$fms_on_time = intval($fms['on_time']);
			}
		} catch (Throwable $e) {
			// ignore fms errors, keep zeros
		}

		$fms_completion_percent = $fms_planned > 0 ? round(($fms_completed / $fms_planned) * 100) : 0;
		$fms_on_time_percent = $fms_planned > 0 ? round(($fms_on_time / $fms_planned) * 100) : 0;

		$weeklyReports[] = [
			'week_start' => $week['start'],
			'week_end' => $week['end'],
			'week_label' => $week['label'],
			'planned' => $planned,
			'actual' => $actual,
			'on_time' => $onTime,
			'late' => $late,
			'completion_percent' => $completionPercent,
			'on_time_percent' => $onTimePercent,
			'fms_planned' => $fms_planned,
			'fms_completed' => $fms_completed,
			'fms_on_time' => $fms_on_time,
			'fms_completion_percent' => $fms_completion_percent,
			'fms_on_time_percent' => $fms_on_time_percent
		];
	}

	echo json_encode(["success" => true, "user" => $user, "weekly_reports" => $weeklyReports]);
	exit;
} catch (Throwable $e) {
	http_response_code(500);
	echo json_encode(["error" => "Server error", "details" => $e->getMessage()]);
	exit;
}
