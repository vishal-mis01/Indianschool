-- Add foreign key constraints to attendance tables
-- Run this AFTER both DATABASE_CLASSES_SUBJECTS.sql and DATABASE_ATTENDANCE.sql have been executed

USE u597629147_tasks_db;

-- Add foreign keys to class_students table
ALTER TABLE class_students
ADD CONSTRAINT fk_class_students_class_id FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_class_students_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add foreign keys to attendance table
ALTER TABLE attendance
ADD CONSTRAINT fk_attendance_class_id FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_attendance_student_user_id FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_attendance_teacher_user_id FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE RESTRICT;