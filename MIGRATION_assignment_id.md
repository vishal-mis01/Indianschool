# Database Migration: Add assignment_id Support to task_submissions

## Status
**REQUIRED** - This migration must be run for multiple-occurrence task support to work.

## Issue
The task_submissions table currently only has `task_template_id` for uniqueness, which prevents storing multiple submissions of the same task on the same day (even with different `assignment_id` values).

## Migration SQL

Run these commands on the production database via phpMyAdmin or MySQL CLI:

```sql
-- 1. Add assignment_id column to task_submissions
ALTER TABLE task_submissions ADD COLUMN assignment_id INT NULL AFTER task_template_id;

-- 2. Drop old unique constraint that only uses task_template_id
ALTER TABLE task_submissions DROP INDEX IF EXISTS uniq_task;

-- 3. Add new unique constraint using assignment_id (when provided)
ALTER TABLE task_submissions ADD UNIQUE KEY uniq_assignment_submission (user_id, assignment_id, task_date);

-- 4. Add index for faster queries
ALTER TABLE task_submissions ADD INDEX idx_assignment_id (assignment_id);

-- 5. Verify the migration (optional - just for checking)
SHOW COLUMNS FROM task_submissions;
SHOW INDEXES FROM task_submissions;
```

## Verification

After running the migration, verify with:

```sql
-- Should show: UNIQUE KEY uniq_assignment_submission (user_id, assignment_id, task_date)
SHOW INDEXES FROM task_submissions WHERE Column_name = 'assignment_id';

-- Should show the new column
DESCRIBE task_submissions;
```

## Impact

- **Before migration**: Same task template + same date = error (constraint violation)
- **After migration**: Multiple assignments of same template on same date are allowed (tracked by assignment_id)

## When to Run

Run this BEFORE users try to submit multiple instances of the same task. It should be run immediately.

## Files Affected

These files have already been updated to support assignment_id:
- ✅ submit_task.php - Accepts and uses assignment_id
- ✅ get_user_report.php - Queries by assignment_id (with fallback)
- ✅ UserAllTasks.js - Sends assignment_id in submissions
- ✅ UserTasks.js - Sends assignment_id in submissions
- ✅ AdminAssignTaskScreen.js - Creates assignments with IDs
