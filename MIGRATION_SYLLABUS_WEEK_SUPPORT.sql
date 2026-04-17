-- Migration: Add week_no support to syllabus table for week-wise lesson planning

-- Add week_no column to syllabus table
ALTER TABLE syllabus ADD COLUMN week_no INT DEFAULT 0 AFTER class_subject_id;

-- Recreate unique constraint to include week_no
-- First, drop the old unique constraint if it exists (name may vary)
-- Then add the new one
ALTER TABLE syllabus 
DROP INDEX IF EXISTS unique_syllabus,
DROP INDEX IF EXISTS idx_unique_syllabus;

-- Add new unique constraint including week_no
ALTER TABLE syllabus 
ADD UNIQUE KEY unique_syllabus_week (class_subject_id, week_no, chapter_no, topic, sub_topic);

-- Add index for week-based queries
ALTER TABLE syllabus 
ADD INDEX idx_week_no (class_subject_id, week_no),
ADD INDEX idx_chapter_week (chapter_no, week_no);

-- Update the table comment to document the week structure
ALTER TABLE syllabus COMMENT='Syllabus with week-wise organization for lesson planning';
