-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    has_activities BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create class_subjects junction table
CREATE TABLE IF NOT EXISTS class_subjects (
    class_subject_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    class_id INT UNSIGNED NOT NULL,
    subject_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_class_subject (class_id, subject_id)
);

-- Create user_class_subjects access control table
CREATE TABLE IF NOT EXISTS user_class_subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    class_subject_id INT UNSIGNED NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_subject_id) REFERENCES class_subjects(class_subject_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_class_subject (user_id, class_subject_id)
);

-- Create indexes for performance
CREATE INDEX idx_class_id ON class_subjects(class_id);
CREATE INDEX idx_subject_id ON class_subjects(subject_id);
CREATE INDEX idx_user_id ON user_class_subjects(user_id);
CREATE INDEX idx_class_subject_id ON user_class_subjects(class_subject_id);
