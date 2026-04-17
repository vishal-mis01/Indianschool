## Week-Wise Lesson Plan Upload Implementation Guide

### ✅ What Has Been Updated

#### 1. **Database Migration** (`MIGRATION_SYLLABUS_WEEK_SUPPORT.sql`)
- Adds `week_no` column to the `syllabus` table
- Creates new unique constraint: `(class_subject_id, week_no, chapter_no, topic, sub_topic)`
- Adds indexes for week-based queries: `idx_week_no`, `idx_chapter_week`
- **Action Required**: Run this migration on the production database

#### 2. **Backend API** (`/api/curriculum/upload_syllabus.php`)
- Updated CSV parsing to extract `week_no` from column A
- Updated Excel parsing to extract `week_no` from column A (index 0)
- Modified INSERT queries to include `week_no` field
- Modified UPDATE queries to include `week_no` in WHERE clause
- Updated validation to require `week_no`, `chapter_no`, `chapter_name`, `topic`, `sub_topic`
- Column mapping now:
  - Column A: `week_no` → index 0
  - Column B: `chapter_no` → index 1
  - Column C: `chapter_name` → index 2
  - Column D: `topic` → index 3
  - Column E: `sub_topic` → index 4
  - Column F: `activity` → index 5
  - Column G: `lec_required` → index 6
  - Column H: `sequence_order` → index 7
  - Column I: `section_type` → index 8

#### 3. **Frontend UI** (`AdminSyllabusUploadScreen.js`)
- Updated instruction panel to show week-wise column structure
- Updated required minimum columns from 4 to 5 (A-E)
- Updated maximum supported columns from 8 to 9 (A-I)
- Column descriptions now match the new week-based structure

---

### 📋 Excel Upload Format

**File**: `.xlsx` or `.csv` with headers in Row 1

| Col | Field | Example | Required | Type |
|-----|-------|---------|----------|------|
| A | `week_no` | 1, 2, 3 | ✅ Yes | Integer |
| B | `chapter_no` | 1, 2, 5 | ✅ Yes | Integer |
| C | `chapter_name` | "Coordination Compounds" | ✅ Yes | String |
| D | `topic` | "INTRODUCTION" | ✅ Yes | String |
| E | `sub_topic` | "DEFINITION, LIGANDS" | ✅ Yes | String |
| F | `activity` | "WORKSHEET PRACTICE" | ❌ No | String |
| G | `lec_required` | 0.5, 1, 2 | ❌ No | Decimal |
| H | `sequence_order` | 1, 2, 3 | ❌ No | Integer |
| I | `section_type` | "theory", "practical" | ❌ No | String |

---

### 📝 Example Excel Content

```
week_no | chapter_no | chapter_name           | topic          | sub_topic
--------|-----------|------------------------|----------------|---------------------------
1       | 1         | Coordination Compounds | INTRODUCTION   | DEFINITION
1       | 1         | Coordination Compounds | INTRODUCTION   | LIGANDS
1       | 1         | Coordination Compounds | BONDING        | METAL COORDINATION
2       | 1         | Coordination Compounds | BONDING        | EXTENDED STRUCTURE
2       | 2         | Organic Reactions      | SUBSTITUTION   | NUCLEOPHILIC
3       | 2         | Organic Reactions      | ELIMINATION    | E1 MECHANISM
```

---

### 🔧 Next Steps (Required)

#### Step 1: Run Database Migration
```bash
mysql -h localhost -u root -p < MIGRATION_SYLLABUS_WEEK_SUPPORT.sql
```
Or in phpMyAdmin:
1. Open your database `u597629147_tasks_db`
2. Go to "SQL" tab
3. Copy and paste the SQL from `MIGRATION_SYLLABUS_WEEK_SUPPORT.sql`
4. Click "Go"

#### Step 2: Test the Upload
1. Go to Admin Dashboard → Upload Syllabus
2. Create an Excel file matching the format above
3. Upload for a test class-subject
4. Verify data in database:
   ```sql
   SELECT * FROM syllabus WHERE class_subject_id = [test_id] ORDER BY week_no, sequence_order;
   ```

#### Step 3: Update Related APIs (Optional but Recommended)
These APIs may need updates to properly handle the `week_no` field:
- `/curriculum/list_chapters.php` - Filter/group by week_no
- `/curriculum/assign_chapter.php` - Consider week-based assignment logic
- `/curriculum/get_chapter_content.php` - Include week information
- `UserLessonPlans.js` - Display lessons grouped by week

---

### 📊 Database Table Now Supports

**Column Structure After Migration**:
```sql
CREATE TABLE syllabus (
    syllabus_id INT PRIMARY KEY AUTO_INCREMENT,
    class_subject_id INT NOT NULL,
    week_no INT DEFAULT 0,           -- ← NEW: Week number (1-52)
    chapter_no INT NOT NULL,
    chapter_name VARCHAR(255),
    topic VARCHAR(255),
    sub_topic VARCHAR(255),
    activity TEXT,
    lec_required DECIMAL(5,2),
    sequence_order INT,
    section_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### ⚠️ Important Notes

1. **Migration First**: Always run the migration BEFORE uploading week-wise data
2. **Backward Compatibility**: Old syllabus records (without `week_no`) will have `week_no=0`
3. **Uniqueness**: Same content can now exist in different weeks (e.g., "DEFINITIONS" in Week 1 and Week 2)
4. **Sorting**: Always sort by `week_no, sequence_order` when displaying

---

### 🧪 Validation Checklist

- [ ] Migration SQL executed successfully
- [ ] `week_no` column appears in `syllabus` table
- [ ] Test Excel file with 5+ columns created
- [ ] File uploaded without errors
- [ ] Data visible in phpMyAdmin with correct week grouping
- [ ] Subsequent uploads can update records (check `updated_rows` in response)

