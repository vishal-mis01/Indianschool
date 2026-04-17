    <?php
    require_once __DIR__ . '/_cors.php';
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/auth.php';

    header("Content-Type: application/json");

    if (!isset($auth_user) || !in_array(($auth_user['role'] ?? ''), ['admin', 'process_coordinator'])) {
        http_response_code(403);
        echo json_encode(["error" => "Admin or Process Coordinator only"]);
        exit;
    }

    try {
        // Get today's date
        $today = date('Y-m-d');

        error_log("get_users_without_chapter_assignments.php: Starting for date=$today");

        // First check if user_syllabus_progress table exists
        $checkTable = $pdo->query("SHOW TABLES LIKE 'user_syllabus_progress'");
        if ($checkTable->rowCount() == 0) {
            error_log("get_users_without_chapter_assignments.php: user_syllabus_progress table does not exist");
            http_response_code(500);
            echo json_encode([
                'error' => 'Database table user_syllabus_progress does not exist',
                'details' => 'Please create the user_syllabus_progress table'
            ]);
            exit;
        }

        // Determine which date field is available in user_syllabus_progress
        $dateField = 'planned_date';
        $checkColumn = $pdo->query("SHOW COLUMNS FROM user_syllabus_progress LIKE 'planned_date'");
        $columnInfo = $checkColumn->fetchAll(PDO::FETCH_ASSOC);
        if (count($columnInfo) === 0) {
            error_log("get_users_without_chapter_assignments.php: planned_date column missing, falling back to created_at");
            $dateField = 'created_at';
        }

        // Get users and their specific subjects that haven't been assigned chapters today
        $stmt = $pdo->prepare("
            SELECT
                u.id as user_id,
                u.name as user_name,
                u.email,
                CONCAT(c.class_name, ' - ', s.subject_name) as subject_name,
                cs.class_subject_id
            FROM users u
            JOIN user_class_subjects ucs ON u.id = ucs.user_id
            JOIN class_subjects cs ON ucs.class_subject_id = cs.class_subject_id
            JOIN classes c ON cs.class_id = c.class_id
            JOIN subjects s ON cs.subject_id = s.subject_id
            WHERE u.role = 'user'
            AND cs.class_subject_id NOT IN (
                SELECT DISTINCT usp.class_subject_id
                FROM user_syllabus_progress usp
                WHERE DATE(usp." . $dateField . ") = ?
                AND usp.user_id = u.id
            )
            ORDER BY u.name, c.class_name, s.subject_name
        ");

        $stmt->execute([$today]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        error_log("get_users_without_chapter_assignments.php: Found " . count($results) . " user-subject combinations without chapter assignments using date field " . $dateField);

        // Group results by user
        $users_without_chapters = [];
        foreach ($results as $result) {
            $user_id = $result['user_id'];
            if (!isset($users_without_chapters[$user_id])) {
                $users_without_chapters[$user_id] = [
                    'user_id' => $result['user_id'],
                    'user_name' => $result['user_name'],
                    'email' => $result['email'],
                    'unassigned_subjects' => [],
                    'unassigned_subjects_count' => 0
                ];
            }
            $users_without_chapters[$user_id]['unassigned_subjects'][] = $result['subject_name'];
            $users_without_chapters[$user_id]['unassigned_subjects_count']++;
        }

        // Convert to indexed array and format subjects as comma-separated string
        $users_without_chapters = array_values($users_without_chapters);
        foreach ($users_without_chapters as &$user) {
            $user['assigned_subjects'] = implode(', ', $user['unassigned_subjects']);
            unset($user['unassigned_subjects']); // Remove the array, keep the string
        }

        echo json_encode([
            'success' => true,
            'data' => $users_without_chapters,
            'date' => $today
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Failed to fetch users without chapter assignments',
            'details' => $e->getMessage()
        ]);
    }