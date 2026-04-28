<?php
// api/admin_manage_app_versions.php
// Admin endpoint to manage app versions and releases

require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

header("Content-Type: application/json");

// Admin only
if (!isset($auth_user) || ($auth_user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Admin only"]);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? null;

try {
    // Create table if needed
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS app_versions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            version VARCHAR(20) UNIQUE NOT NULL,
            platform VARCHAR(20) NOT NULL,
            release_notes LONGTEXT,
            changes JSON,
            is_required BOOLEAN DEFAULT FALSE,
            download_url VARCHAR(500),
            released_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            INDEX idx_version (version),
            INDEX idx_platform (platform)
        )
    ");

    switch ($action) {
        // GET: List all versions
        case 'list':
            $stmt = $pdo->prepare("
                SELECT * FROM app_versions
                ORDER BY released_at DESC
            ");
            $stmt->execute();
            $versions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON fields
            foreach ($versions as &$v) {
                $v['changes'] = $v['changes'] ? json_decode($v['changes'], true) : [];
            }
            
            echo json_encode([
                "success" => true,
                "versions" => $versions,
                "count" => count($versions)
            ]);
            break;

        // POST: Create new version
        case 'create':
            $requiredFields = ['version', 'platform'];
            $missing = [];
            foreach ($requiredFields as $field) {
                if (empty($_POST[$field])) {
                    $missing[] = $field;
                }
            }
            if (!empty($missing)) {
                http_response_code(400);
                echo json_encode(["error" => "Missing fields: " . implode(', ', $missing)]);
                exit;
            }

            $version = trim($_POST['version']);
            $platform = trim($_POST['platform']); // 'web', 'ios', 'android'
            $releaseNotes = $_POST['release_notes'] ?? null;
            $isRequired = isset($_POST['is_required']) ? (bool)$_POST['is_required'] : false;
            $downloadUrl = $_POST['download_url'] ?? null;
            
            // Parse changes JSON or convert from array
            $changes = [];
            if (!empty($_POST['changes'])) {
                if (is_string($_POST['changes'])) {
                    $changes = json_decode($_POST['changes'], true) ?? [];
                } elseif (is_array($_POST['changes'])) {
                    $changes = $_POST['changes'];
                }
            }
            $changesJson = json_encode($changes);

            // Validate platform
            $validPlatforms = ['web', 'ios', 'android'];
            if (!in_array($platform, $validPlatforms)) {
                http_response_code(400);
                echo json_encode(["error" => "Invalid platform. Must be: " . implode(', ', $validPlatforms)]);
                exit;
            }

            // When creating a new version, deactivate older ones for same platform
            $pdo->beginTransaction();
            
            try {
                // Deactivate previous versions for this platform
                $stmt = $pdo->prepare("
                    UPDATE app_versions SET is_active = FALSE
                    WHERE platform = ? AND is_active = TRUE
                ");
                $stmt->execute([$platform]);

                // Insert new version
                $stmt = $pdo->prepare("
                    INSERT INTO app_versions 
                    (version, platform, release_notes, changes, is_required, download_url, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, TRUE)
                ");
                $stmt->execute([
                    $version,
                    $platform,
                    $releaseNotes,
                    $changesJson,
                    $isRequired ? 1 : 0,
                    $downloadUrl
                ]);

                $pdo->commit();

                echo json_encode([
                    "success" => true,
                    "message" => "Version $version created for $platform",
                    "version" => [
                        "id" => $pdo->lastInsertId(),
                        "version" => $version,
                        "platform" => $platform,
                        "is_required" => $isRequired,
                        "is_active" => true
                    ]
                ]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        // POST: Update version
        case 'update':
            $versionId = (int)($_POST['id'] ?? 0);
            if (!$versionId) {
                http_response_code(400);
                echo json_encode(["error" => "Version ID required"]);
                exit;
            }

            // Build update query
            $updates = [];
            $params = [];
            
            if (isset($_POST['release_notes'])) {
                $updates[] = "release_notes = ?";
                $params[] = $_POST['release_notes'];
            }
            if (isset($_POST['is_required'])) {
                $updates[] = "is_required = ?";
                $params[] = (bool)$_POST['is_required'] ? 1 : 0;
            }
            if (isset($_POST['download_url'])) {
                $updates[] = "download_url = ?";
                $params[] = $_POST['download_url'];
            }
            if (isset($_POST['changes'])) {
                $changes = is_string($_POST['changes']) 
                    ? json_decode($_POST['changes'], true) ?? []
                    : (is_array($_POST['changes']) ? $_POST['changes'] : []);
                $updates[] = "changes = ?";
                $params[] = json_encode($changes);
            }

            if (empty($updates)) {
                http_response_code(400);
                echo json_encode(["error" => "No fields to update"]);
                exit;
            }

            $params[] = $versionId;
            $sql = "UPDATE app_versions SET " . implode(", ", $updates) . " WHERE id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            echo json_encode([
                "success" => true,
                "message" => "Version updated"
            ]);
            break;

        // POST: Deactivate version
        case 'deactivate':
            $versionId = (int)($_POST['id'] ?? 0);
            if (!$versionId) {
                http_response_code(400);
                echo json_encode(["error" => "Version ID required"]);
                exit;
            }

            $stmt = $pdo->prepare("UPDATE app_versions SET is_active = FALSE WHERE id = ?");
            $stmt->execute([$versionId]);

            echo json_encode([
                "success" => true,
                "message" => "Version deactivated"
            ]);
            break;

        // DELETE: Delete version (shouldn't be common, but useful for test data)
        case 'delete':
            $versionId = (int)($_POST['id'] ?? $_GET['id'] ?? 0);
            if (!$versionId) {
                http_response_code(400);
                echo json_encode(["error" => "Version ID required"]);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM app_versions WHERE id = ?");
            $stmt->execute([$versionId]);

            echo json_encode([
                "success" => true,
                "message" => "Version deleted"
            ]);
            break;

        default:
            http_response_code(400);
            echo json_encode([
                "error" => "Invalid action",
                "valid_actions" => ["list", "create", "update", "deactivate", "delete"]
            ]);
    }

} catch (PDOException $e) {
    // Check for duplicate version
    if (strpos($e->getMessage(), 'Duplicate') !== false) {
        http_response_code(400);
        echo json_encode(["error" => "Version already exists"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
