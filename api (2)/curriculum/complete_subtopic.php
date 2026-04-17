<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

if (!isset($auth_user)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$class_subject_id = (int)($data['class_subject_id'] ?? 0);
$chapter_no = (int)($data['chapter_no'] ?? 0);
$topic = trim($data['topic'] ?? '');
$sub_topic = trim($data['sub_topic'] ?? '');

// If only chapter_no and class_subject_id provided, mark whole chapter complete
$mark_whole_chapter = empty($topic) && empty($sub_topic);

if (!$class_subject_id || !$chapter_no) {
    http_response_code(400);
    echo json_encode(["error" => "class_subject_id and chapter_no required"]);
    exit;
}

try {
    $user_id = $auth_user['id'];

    if ($mark_whole_chapter) {
        // Mark all subtopics in chapter as complete
        $stmt = $pdo->prepare("
            UPDATE user_syllabus_progress 
            SET status = 'completed', completed_date = NOW()
            WHERE user_id = ? AND class_subject_id = ? AND chapter_no = ?
        ");
        $stmt->execute([$user_id, $class_subject_id, $chapter_no]);
    } else {
        // Mark specific subtopic as complete
        if (!$topic || !$sub_topic) {
            http_response_code(400);
            echo json_encode(["error" => "topic and sub_topic required when marking individual subtopic"]);
            exit;
        }

        $stmt = $pdo->prepare("
            UPDATE user_syllabus_progress 
            SET status = 'completed', completed_date = NOW()
            WHERE user_id = ? AND class_subject_id = ? AND chapter_no = ? AND topic = ? AND sub_topic = ?
        ");
        $stmt->execute([$user_id, $class_subject_id, $chapter_no, $topic, $sub_topic]);

        if ($stmt->rowCount() === 0) {
            // Fallback: topic label mismatch, match by sub_topic only
            $stmt = $pdo->prepare("
                UPDATE user_syllabus_progress 
                SET status = 'completed', completed_date = NOW()
                WHERE user_id = ? AND class_subject_id = ? AND chapter_no = ? AND sub_topic = ?
            ");
            $stmt->execute([$user_id, $class_subject_id, $chapter_no, $sub_topic]);
        }

        if ($stmt->rowCount() === 0) {
            // As ultimate fallback, insert a record if not found
            $insertStmt = $pdo->prepare("
                INSERT INTO user_syllabus_progress
                (user_id, class_subject_id, chapter_no, topic, sub_topic, status, completed_date)
                VALUES (?, ?, ?, ?, ?, 'completed', NOW())
            ");
            $insertStmt->execute([$user_id, $class_subject_id, $chapter_no, $topic, $sub_topic]);

            if ($insertStmt->rowCount() > 0) {
                echo json_encode(["success" => true, "message" => "Chapter marked as complete (inserted new progress record)"]);
                exit;
            }
        }
    }

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(["error" => "No progress records updated"]);
        exit;
    }

    // Check if ALL subtopics for this chapter are now complete
    $checkStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM user_syllabus_progress
        WHERE user_id = ? AND class_subject_id = ? AND chapter_no = ?
    ");
    $checkStmt->execute([$user_id, $class_subject_id, $chapter_no]);
    $progress = $checkStmt->fetch(PDO::FETCH_ASSOC);

    $allComplete = ($progress['total'] > 0 && $progress['total'] == $progress['completed']);

    error_log("Chapter $chapter_no: total={$progress['total']}, completed={$progress['completed']}, allComplete=$allComplete");

    if ($allComplete) {
        // Mark entire chapter as completed in a single "chapter_complete" record
        $completeStmt = $pdo->prepare("
            INSERT INTO user_syllabus_progress
            (user_id, class_subject_id, chapter_no, topic, sub_topic, status, completed_date)
            VALUES (?, ?, ?, 'CHAPTER_COMPLETE', 'CHAPTER_COMPLETE', 'completed', NOW())
            ON DUPLICATE KEY UPDATE
                completed_date = NOW()
        ");
        $completeStmt->execute([$user_id, $class_subject_id, $chapter_no]);
        error_log("Chapter $chapter_no marked as fully complete for user $user_id");
    }

    echo json_encode(["success" => true, "chapter_complete" => $allComplete, "message" => "Chapter marked as complete"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
