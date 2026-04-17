<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

// Allow users to view their own subject
if (!isset($auth_user)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

try {
    $user_id = $auth_user['id'];
    
    error_log("list_user_class_subjects.php: user_id=$user_id");
    
    // Get user's assigned class-subjects (including those without syllabus yet)
    $stmt = $pdo->prepare("
        SELECT DISTINCT
            ucs.class_subject_id as id,
            ucs.user_id,
            ucs.class_subject_id,
            c.class_id,
            c.class_name,
            s.subject_id,
            s.subject_name,
            ucs.assigned_at
        FROM user_class_subjects ucs
        JOIN class_subjects cs ON ucs.class_subject_id = cs.class_subject_id
        JOIN classes c ON cs.class_id = c.class_id
        JOIN subjects s ON cs.subject_id = s.subject_id
        LEFT JOIN syllabus sy ON cs.class_subject_id = sy.class_subject_id
        WHERE ucs.user_id = ?
        GROUP BY ucs.class_subject_id, c.class_id, c.class_name, s.subject_id, s.subject_name, ucs.assigned_at
        ORDER BY c.class_name ASC, s.subject_name ASC
    ");
    $stmt->execute([$user_id]);
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("list_user_class_subjects.php: Found " . count($assignments) . " assignments");
    if (count($assignments) > 0) {
        error_log("First assignment: " . json_encode($assignments[0]));
        // Log all class_subject_ids
        $ids = array_column($assignments, 'class_subject_id');
        error_log("All class_subject_ids: " . implode(', ', $ids));
        // Log unique class_subject_ids
        $unique_ids = array_unique($ids);
        error_log("Unique class_subject_ids: " . implode(', ', $unique_ids));
        // Log by class
        $by_class = [];
        foreach ($assignments as $a) {
            $class = $a['class_name'];
            if (!isset($by_class[$class])) $by_class[$class] = [];
            $by_class[$class][] = $a['class_subject_id'] . ':' . $a['subject_name'];
        }
        foreach ($by_class as $class => $subjects) {
            error_log("Class $class: " . implode(', ', $subjects));
        }
    }
    
    echo json_encode($assignments);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
