-- Attendance tables for class-based student attendance tracking

-- Create tables without foreign key constraints
CREATE TABLE IF NOT EXISTS class_students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT UNSIGNED NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY class_user_unique (class_id, user_id),
    INDEX idx_class_id (class_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT UNSIGNED NOT NULL,
    student_user_id INT NOT NULL,
    teacher_user_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(40) NOT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY student_attendance_unique (class_id, student_user_id, attendance_date),
    INDEX idx_class_date (class_id, attendance_date),
    INDEX idx_student_date (student_user_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
