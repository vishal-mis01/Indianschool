<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/config.php';

$sql = "
CREATE TABLE IF NOT EXISTS travel_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    starting_kms DECIMAL(10,2) NOT NULL,
    ending_kms DECIMAL(10,2) NOT NULL,
    total_kms DECIMAL(10,2) NOT NULL,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    location_accuracy DECIMAL(10,2) NULL,
    location_timestamp DATETIME NULL,
    photo_path VARCHAR(255) NULL,
    photo_timestamp DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

try {
    $pdo->exec($sql);
    echo "Travel records table created successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>