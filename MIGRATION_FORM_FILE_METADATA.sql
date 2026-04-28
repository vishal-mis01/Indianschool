-- Add metadata columns to form_submission_files table for camera photo location and timestamp
ALTER TABLE form_submission_files
ADD COLUMN latitude DECIMAL(10, 8) NULL,
ADD COLUMN longitude DECIMAL(11, 8) NULL,
ADD COLUMN accuracy DECIMAL(8, 2) NULL,
ADD COLUMN captured_at DATETIME NULL;

-- Add index for location queries
ALTER TABLE form_submission_files
ADD INDEX idx_location (latitude, longitude),
ADD INDEX idx_captured_at (captured_at);