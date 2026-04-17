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

$class_subject_id = (int)($_GET['class_subject_id'] ?? 0);
$chapter_no = (int)($_GET['chapter_no'] ?? 0);

if (!$class_subject_id || !$chapter_no) {
    http_response_code(400);
    echo json_encode(["error" => "class_subject_id and chapter_no required"]);
    exit;
}

try {
    // Get chapter info from syllabus
    $stmt = $pdo->prepare("
        SELECT DISTINCT 
            chapter_no,
            chapter_name,
            SUM(lec_required) as total_days,
            COUNT(DISTINCT CONCAT(topic, '_', sub_topic)) as total_subtopics
        FROM syllabus
        WHERE class_subject_id = ? AND chapter_no = ?
    ");
    $stmt->execute([$class_subject_id, $chapter_no]);
    $chapter = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$chapter) {
        http_response_code(404);
        echo json_encode(["error" => "Chapter not found"]);
        exit;
    }

    // Get topics with their subtopics from syllabus
    $stmt = $pdo->prepare("
        SELECT 
            topic,
            sub_topic,
            lec_required,
            sequence_order
        FROM syllabus
        WHERE class_subject_id = ? AND chapter_no = ?
        ORDER BY topic, sub_topic
    ");
    $stmt->execute([$class_subject_id, $chapter_no]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Group by topic
    $topics = [];
    foreach ($rows as $row) {
        $topic = $row['topic'];
        if (!isset($topics[$topic])) {
            $topics[$topic] = [
                'topic_name' => $topic,
                'subtopics' => []
            ];
        }
        $topics[$topic]['subtopics'][] = [
            'sub_topic' => $row['sub_topic'],
            'lec_required' => (int)$row['lec_required'],
            'sequence_order' => (int)$row['sequence_order']
        ];
    }

    echo json_encode([
        'chapter' => $chapter,
        'topics' => array_values($topics)
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
