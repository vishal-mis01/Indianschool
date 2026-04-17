<?php
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

header("Content-Type: application/json");

if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

$class_subject_id = (int)($_POST['class_subject_id'] ?? 0);

if (!$class_subject_id) {
    http_response_code(400);
    echo json_encode(["error" => "class_subject_id required"]);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $error_msg = "File upload failed";
    if (isset($_FILES['file'])) {
        $error_codes = [
            UPLOAD_ERR_INI_SIZE => "File exceeds upload_max_filesize",
            UPLOAD_ERR_FORM_SIZE => "File exceeds MAX_FILE_SIZE",
            UPLOAD_ERR_PARTIAL => "File upload incomplete",
            UPLOAD_ERR_NO_FILE => "No file received",
            UPLOAD_ERR_NO_TMP_DIR => "No temp directory",
            UPLOAD_ERR_CANT_WRITE => "Cannot write to disk",
            UPLOAD_ERR_EXTENSION => "Upload blocked by extension",
        ];
        $error_msg = $error_codes[$_FILES['file']['error']] ?? "Upload error: " . $_FILES['file']['error'];
    }
    echo json_encode(["error" => $error_msg, "debug" => [
        "files_received" => isset($_FILES['file']),
        "post_received" => isset($_POST['class_subject_id']),
        "error_code" => $_FILES['file']['error'] ?? null
    ]]);
    exit;
}

try {
    $file = $_FILES['file'];
    $filename = $file['name'];
    $tmpPath = $file['tmp_name'];
    
    // Log for debugging
    error_log("Upload file: $filename, tmpPath: $tmpPath");
    
    // Read file content   
    $content = file_get_contents($tmpPath);
    
    // Parse based on file type
    $rows = [];
    $fileExt = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    
    error_log("File extension detected: $fileExt");
    
    if ($fileExt === 'csv') {
        // CSV parsing
        $lines = array_filter(explode("\n", $content));
        $rowCount = 0;
        $debugRows = [];
        
        foreach ($lines as $line) {
            $rowCount++;
            // Skip header row (first row)
            if ($rowCount === 1) continue;
            
            $row = str_getcsv($line);
            
            // Debug: capture first few rows
            if ($rowCount <= 3) {
                $debugRows[] = $row;
            }
            
            // Need at least 4 required columns, can have up to 7
            if (count($row) >= 4) {
                $lec_required_raw = trim($row[5] ?? '0');
                $lec_required_parsed = floatval($lec_required_raw);

                $section_type = trim($row[7] ?? '');
                error_log("CSV Row " . ($rowCount-1) . " | lec_required: raw='$lec_required_raw', parsed=$lec_required_parsed | section_type: '$section_type' (length=" . strlen($section_type) . ")");

                $rows[] = [
                    'chapter_no' => trim($row[0] ?? ''),
                    'chapter_name' => trim($row[1] ?? ''),
                    'topic' => trim($row[2] ?? ''),
                    'sub_topic' => trim($row[3] ?? ''),
                    'activity' => trim($row[4] ?? ''),
                    'lec_required' => $lec_required_parsed,
                    'sequence_order' => intval(trim($row[6] ?? '0')),
                    'section_type' => $section_type,
                ];
            }
        }
        
        error_log("CSV parsing: Found $rowCount rows, extracted " . count($rows) . " data rows. Debug: " . json_encode($debugRows));
    } elseif (in_array($fileExt, ['xlsx', 'xls', 'xlsm'])) {
        // XLSX/XLS parsing using built-in ZIP extension
        if (!extension_loaded('zip')) {
            http_response_code(400);
            echo json_encode(["error" => "ZIP extension not available. Please use CSV format instead."]);
            exit;
        }
        
        try {
            $zip = new ZipArchive();
            if ($zip->open($tmpPath) !== true) {
                error_log("Could not open xlsx zip file");
                http_response_code(400);
                echo json_encode(["error" => "Could not open Excel file. Make sure it's a valid Excel file."]);
                exit;
            }
            
            // First, read shared strings (text values)
            $sharedStrings = [];
            $sharedXml = $zip->getFromName('xl/sharedStrings.xml');
            if ($sharedXml !== false) {
                $stringObj = simplexml_load_string($sharedXml);
                if ($stringObj !== false) {
                    foreach ($stringObj->si as $si) {
                        $sharedStrings[] = (string)$si->t;
                    }
                }
            }
            
            // Read the sheet1.xml file (first sheet)
            $xml = $zip->getFromName('xl/worksheets/sheet1.xml');
            $zip->close();
            
            if ($xml === false) {
                error_log("Could not read worksheet in xlsx file");
                http_response_code(400);
                echo json_encode(["error" => "Could not read worksheet data from Excel file"]);
                exit;
            }
            
            // Parse Excel rows
            $xmlObj = simplexml_load_string($xml);
            if ($xmlObj === false) {
                error_log("Could not parse XML from xlsx");
                http_response_code(400);
                echo json_encode(["error" => "Could not parse Excel file XML"]);
                exit;
            }
            
            $sheetData = $xmlObj->sheetData;
            $rowCount = 0;
            $debugRows = []; // For logging
            
            foreach ($sheetData->row as $rowObj) {
                $rowCount++;
                // Skip header row (row 1)
                if ($rowCount === 1) continue;
                
                $cells = [];
                $colIndex = 0;
                
                foreach ($rowObj->c as $cell) {
                    // Extract column letter (A, B, C, etc)
                    $cellRef = (string)$cell['r']; // e.g., "A2", "B2"
                    $colLetter = preg_replace('/[0-9]/', '', $cellRef); // Get letter only
                    $colIndex = ord($colLetter) - ord('A'); // Convert to 0-based index
                    
                    $value = "";
                    
                    // Get cell value
                    if (isset($cell['t']) && ($cell['t'] == 's' || $cell['t'] == 'str')) {
                        // String reference - use the index from cell value
                        $idx = (int)$cell->v;
                        if (isset($sharedStrings[$idx])) {
                            $value = $sharedStrings[$idx];
                        }
                    } else {
                        // Direct value (number, date, etc)
                        $value = (string)$cell->v;
                    }
                    
                    // Ensure array is large enough
                    while (count($cells) <= $colIndex) {
                        $cells[] = "";
                    }
                    $cells[$colIndex] = $value;
                }
                
                // Ensure we have at least 8 columns
                while (count($cells) < 8) {
                    $cells[] = "";
                }
                
                // Debug: capture first few rows
                if ($rowCount <= 3) {
                    $debugRows[] = $cells;
                }
                
                // Only process rows with data in required fields
                if (!empty($cells[0]) || !empty($cells[1]) || !empty($cells[2]) || !empty($cells[3])) {
                    $lec_required_raw = trim($cells[5] ?? '0');
                    $lec_required_parsed = floatval($lec_required_raw);
                    $section_type = trim($cells[7] ?? '');

                    error_log("Excel Row " . ($rowCount-1) . " | lec_required: raw='$lec_required_raw', parsed=$lec_required_parsed | section_type: '$section_type' (length=" . strlen($section_type) . ")");

                    $rows[] = [
                        'chapter_no' => trim($cells[0]),
                        'chapter_name' => trim($cells[1]),
                        'topic' => trim($cells[2]),
                        'sub_topic' => trim($cells[3]),
                        'activity' => trim($cells[4] ?? ''),
                        'lec_required' => $lec_required_parsed,
                        'sequence_order' => intval(trim($cells[6] ?? '0')),
                        'section_type' => $section_type,
                    ];
                }
            }
            
            error_log("Excel parsing: Found $rowCount rows, extracted " . count($rows) . " data rows. Debug: " . json_encode($debugRows));
        } catch (Exception $e) {
            error_log("Excel parsing error: " . $e->getMessage());
            http_response_code(400);
            echo json_encode(["error" => "Error parsing Excel file: " . $e->getMessage()]);
            exit;
        }
    } else {
        // Unsupported format
        http_response_code(400);
        echo json_encode([
            "error" => "Unsupported file format: .$fileExt",
            "hint" => "Please upload a CSV or XLSX file",
            "debug_filename" => $filename,
            "debug_extension" => $fileExt
        ]);
        exit;
    }

    if (empty($rows)) {
        http_response_code(400);
        echo json_encode([
            "error" => "No valid rows found in file",
            "debug_info" => [
                "raw_rows_processed" => $rowCount ?? 0,
                "first_rows_extracted" => $debugRows ?? [],
                "columns_required" => "At least 4 columns (chapter_no, chapter_name, topic, sub_topic)",
            "columns_optional" => "activity, lec_required, sequence_order, section_type",
                "note" => "Check if CSV has correct column format"
            ]
        ]);
        exit;
    }

    // Validate required columns
    $errors = [];
    foreach ($rows as $idx => $row) {
        if (empty($row['chapter_no']) || empty($row['chapter_name']) || empty($row['topic']) || empty($row['sub_topic'])) {
            $errors[] = [
                'row' => $idx + 2,
                'message' => 'Missing required field (chapter_no, chapter_name, topic, or sub_topic)'
            ];
        }
    }

    // Insert data
    $inserted_rows = 0;
    $updated_rows = 0;
    $insert_errors = [];

    $pdo->beginTransaction();

    foreach ($rows as $idx => $row) {
        try {
            // Log what we're about to process
            error_log("Row $idx: chapter_no={$row['chapter_no']}, topic={$row['topic']}, section_type='{$row['section_type']}' (len=" . strlen($row['section_type']) . ")");
            
            // Check if record exists
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as cnt FROM syllabus
                WHERE class_subject_id = ? 
                AND chapter_no = ? 
                AND topic = ? 
                AND sub_topic = ?
            ");
            $stmt->execute([
                $class_subject_id,
                (int)$row['chapter_no'],
                $row['topic'],
                $row['sub_topic']
            ]);
            $exists = $stmt->fetch(PDO::FETCH_ASSOC)['cnt'] > 0;

            if ($exists) {
                // Update
                $stmt = $pdo->prepare("
                    UPDATE syllabus 
                    SET chapter_name = ?, activity = ?, lec_required = ?, sequence_order = ?, section_type = ?
                    WHERE class_subject_id = ? 
                    AND chapter_no = ? 
                    AND topic = ? 
                    AND sub_topic = ?
                ");
                $stmt->execute([
                    $row['chapter_name'],
                    $row['activity'] ?? null,
                    $row['lec_required'],
                    $row['sequence_order'],
                    $row['section_type'],
                    $class_subject_id,
                    (int)$row['chapter_no'],
                    $row['topic'],
                    $row['sub_topic']
                ]);
                $updated_rows++;
            } else {
                // Insert
                $stmt = $pdo->prepare("
                    INSERT INTO syllabus 
                    (class_subject_id, chapter_no, chapter_name, topic, sub_topic, activity, lec_required, sequence_order, section_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $class_subject_id,
                    (int)$row['chapter_no'],
                    $row['chapter_name'],
                    $row['topic'],
                    $row['sub_topic'],
                    $row['activity'] ?? null,
                    $row['lec_required'],
                    $row['sequence_order'],
                    $row['section_type'],
                ]);
                $inserted_rows++;
            }
        } catch (PDOException $e) {
            $insert_errors[] = [
                'row' => $idx + 2,
                'message' => $e->getMessage()
            ];
        }
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "inserted_rows" => $inserted_rows,
        "updated_rows" => $updated_rows,
        "errors" => array_merge($errors, $insert_errors),
        "preview" => array_slice($rows, 0, 5)
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
