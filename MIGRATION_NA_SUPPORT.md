# Database Migration: Add NA (Not Applicable) Support to Tasks

## Status
**REQUIRED** - This migration adds support for marking tasks as Not Applicable with remarks.

## Changes Required

### 1. Add remarks column to task_submissions table
```sql
ALTER TABLE task_submissions ADD COLUMN remarks TEXT NULL AFTER photo_path;
```

### 2. Update status column to allow 'na' status
The status column currently only accepts 'done'. We need to allow 'na' for Not Applicable tasks.

```sql
-- Update existing constraint or add check constraint
-- Note: MySQL doesn't have CHECK constraints, so we'll handle validation in application code
```

## Migration SQL

Run these commands on the production database:

```sql
-- Add remarks column for NA explanations
ALTER TABLE task_submissions ADD COLUMN remarks TEXT NULL AFTER photo_path;

-- Optional: Add index for remarks if needed for searching
ALTER TABLE task_submissions ADD INDEX idx_remarks (remarks(255));
```

## Verification

After running the migration:

```sql
-- Should show the new remarks column
DESCRIBE task_submissions;

-- Should show the new index
SHOW INDEXES FROM task_submissions WHERE Column_name = 'remarks';
```

## Impact

- **Before migration**: Tasks can only be marked as 'done' with optional photo
- **After migration**: Tasks can be marked as 'done' or 'na' (Not Applicable) with optional remarks explaining why

## API Changes

### Frontend sends (for NA tasks):
- `status`: 'na'
- `remarks`: Optional text explanation (can be empty)

### Backend validation:
- If status is 'na', remarks field is optional (can be empty)
- If status is 'done', remarks field is optional

## Files to Update

1. **submit_task.php** - Handle status and remarks fields
2. **UserTasks.js** - Add NA button and remarks input
3. **get_user_checklist.php** - Filter out NA tasks from pending list
4. **get_user_report.php** - Include NA tasks in reporting</content>
<parameter name="filePath">c:\Users\HP\checklist-app\MIGRATION_NA_SUPPORT.md