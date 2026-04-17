-- Create user_syllabus_progress table for tracking chapter assignments and progress
CREATE TABLE IF NOT EXISTS user_syllabus_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    class_subject_id INT NOT NULL,
    chapter_no INT NOT NULL,
    topic VARCHAR(255) NOT NULL,
    sub_topic VARCHAR(255) NOT NULL,
    planned_date DATE NOT NULL,
    completed_date DATE NULL,
    status ENUM('pending', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_subject_id) REFERENCES class_subjects(class_subject_id) ON DELETE CASCADE,

    UNIQUE KEY unique_user_topic (user_id, class_subject_id, chapter_no, topic, sub_topic),
    INDEX idx_user_id (user_id),
    INDEX idx_class_subject_id (class_subject_id),
    INDEX idx_planned_date (planned_date),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);