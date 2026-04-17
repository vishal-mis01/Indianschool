<?php
// api/check_app_version.php
// Endpoint to check if app update is available

require_once __DIR__ . '/config.php';

header("Content-Type: application/json");

// Get headers
$currentVersion = $_SERVER['HTTP_X_APP_VERSION'] ?? null;
$platform = $_SERVER['HTTP_X_PLATFORM'] ?? 'unknown';

// Database: Create app_versions table if it doesn't exist
try {
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
} catch (Exception $e) {
    error_log("Warning: Could not create app_versions table: " . $e->getMessage());
}

try {
    // Get the latest active version for the current platform
    $stmt = $pdo->prepare("
        SELECT 
            version,
            release_notes,
            changes,
            is_required,
            download_url
        FROM app_versions
        WHERE platform = ? 
        AND is_active = TRUE
        ORDER BY released_at DESC
        LIMIT 1
    ");
    $stmt->execute([$platform]);
    $latestVersion = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$latestVersion) {
        // No updates configured yet
        echo json_encode([
            "update_available" => false,
            "message" => "No updates available"
        ]);
        exit;
    }

    // Check if current version is older than latest
    $updateAvailable = compareVersions($currentVersion, $latestVersion['version']) < 0;

    // Parse JSON fields
    $changes = [];
    if ($latestVersion['changes']) {
        $changesData = json_decode($latestVersion['changes'], true);
        $changes = is_array($changesData) ? $changesData : [];
    }

    echo json_encode([
        "update_available" => $updateAvailable,
        "latest_version" => $latestVersion['version'],
        "current_version" => $currentVersion,
        "is_required" => (bool)$latestVersion['is_required'],
        "release_notes" => $latestVersion['release_notes'],
        "changes" => $changes,
        "download_url" => $latestVersion['download_url'],
        "platform" => $platform
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Failed to check version",
        "debug" => $e->getMessage()
    ]);
}

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions($v1, $v2) {
    // Handle null/empty versions
    if (empty($v1)) $v1 = '0.0.0';
    if (empty($v2)) $v2 = '0.0.0';

    $parts1 = array_map('intval', explode('.', $v1));
    $parts2 = array_map('intval', explode('.', $v2));

    for ($i = 0; $i < max(count($parts1), count($parts2)); $i++) {
        $p1 = $parts1[$i] ?? 0;
        $p2 = $parts2[$i] ?? 0;

        if ($p1 < $p2) return -1;
        if ($p1 > $p2) return 1;
    }

    return 0;
}
?>
