# Database Changes Required for DateTime Support

## Summary
The application now supports datetime (date + time) for task assignments and holidays. The database columns need to be updated from `DATE` to `DATETIME` type to store both date and time.

## Required Changes

### 1. Update `holidays` table
```sql
-- Change the holiday_date column from DATE to DATETIME
ALTER TABLE holidays MODIFY COLUMN holiday_date DATETIME NOT NULL;

-- Or if creating fresh:
CREATE TABLE holidays (
    id INT PRIMARY KEY AUTO_INCREMENT,
    holiday_date DATETIME NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


### 2. Update `task_assignments` table
```sql
-- Change start_date and end_date from DATE to DATETIME
ALTER TABLE task_assignments MODIFY COLUMN start_date DATETIME NOT NULL;
ALTER TABLE task_assignments MODIFY COLUMN end_date DATETIME NULL;

-- Or if creating fresh:
CREATE TABLE task_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_template_id INT NOT NULL,
    assigned_user_id INT NULL,
    assigned_department VARCHAR(100) NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NULL,
    grace_days INT DEFAULT 0,
    skip_weekdays JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_template_id) REFERENCES task_templates(id)
);
```

## Data Migration (if you have existing data)

If you have existing data in DATE format, migrate it with time set to 00:00:00:

```sql
-- For holidays table
ALTER TABLE holidays MODIFY COLUMN holiday_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- For task_assignments table
ALTER TABLE task_assignments MODIFY COLUMN start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE task_assignments MODIFY COLUMN end_date DATETIME NULL;
```

## API Behavior Changes

### Frontend sends:
- Format: `YYYY-MM-DD HH:MM:SS`
- Example: `2026-01-28 14:30:00`

### Backend expects:
- `/admin_assign_task.php`: Receives `start_date` and `end_date` as `YYYY-MM-DD HH:MM:SS`
- `/admin_add_holiday.php`: Receives `holiday_date` as `YYYY-MM-DD HH:MM:SS`

### Backend returns:
- Stored as full datetime values
- Used with `DATE()` function in queries where only date comparison is needed
- Used as-is when time is required

## PHP Query Updates

The following PHP files have been updated to handle datetime:

1. **`admin_add_holiday.php`** ✅
   - Validates format: `YYYY-MM-DD HH:MM:SS`
   - Stores datetime as-is

2. **`admin_assign_task.php`** ✅
   - Validates format: `YYYY-MM-DD HH:MM:SS` for both start and end dates
   - Stores datetime as-is

3. **`get_user_checklist.php`** ✅
   - Uses `DATE()` function to compare only date part
   - Query: `WHERE DATE(ta.start_date) <= ? AND (ta.end_date IS NULL OR DATE(ta.end_date) >= ?)`

4. **`get_user_report.php`** ✅
   - Uses `DATE()` function when retrieving holiday dates
   - Query: `SELECT DATE(holiday_date) as holiday_date FROM holidays`

## No Changes Needed

The following files don't need changes as they handle data correctly:
- `submit_task.php`
- `admin_create_task_template.php`
- `admin_get_assignments.php`
- Other supporting files

## Testing Checklist

- [ ] Test adding a holiday with date and time
- [ ] Test creating task assignment with start and end datetime
- [ ] Verify tasks appear correctly in user checklist
- [ ] Verify datetime displays correctly in admin reports
- [ ] Test with various times (00:00, 23:59, mid-day, etc.)
- [ ] Test edge cases (midnight transitions, timezone handling)

## Rollback (if needed)

To revert to DATE type:
```sql
ALTER TABLE holidays MODIFY COLUMN holiday_date DATE NOT NULL;
ALTER TABLE task_assignments MODIFY COLUMN start_date DATE NOT NULL;
ALTER TABLE task_assignments MODIFY COLUMN end_date DATE NULL;
```

Then revert PHP files to use simple date format: `YYYY-MM-DD`
