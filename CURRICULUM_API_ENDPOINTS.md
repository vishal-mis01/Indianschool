# Curriculum API Endpoints - Using Existing Syllabus Table

All endpoints require authentication via Bearer token in Authorization header.

## Database Tables Used

### Existing Tables
- `syllabus` - Main curriculum data (syllabus_id, class_subject_id, section_type, revision_no, chapter_no, chapter_name, topic, sub_topic, lec_required, sequence_order)
- `class_subjects` - Links subjects to classes
- `user_class_subjects` - Links users to class-subject combinations

### New Table Required
- `user_syllabus_progress` - Tracks student progress through syllabus (see USER_SYLLABUS_PROGRESS_TABLE.sql)

---

## API Endpoints

### 1. GET /curriculum/list_chapters.php
**Purpose**: Get list of chapters for a subject with aggregated metrics

**Query Parameters**:
- `class_subject_id` (required, int) - The class-subject ID

**Response**:
```json
[
  {
    "chapter_no": 1,
    "chapter_name": "Introduction to Science",
    "total_subtopics": 5,
    "total_days": 10
  }
]
```

**Example Request**:
```
GET /curriculum/list_chapters.php?class_subject_id=5
Authorization: Bearer {token}
```

---

### 2. GET /curriculum/get_chapter_content.php
**Purpose**: Get detailed chapter content with all topics and subtopics

**Query Parameters**:
- `class_subject_id` (required, int)
- `chapter_no` (required, int)

**Response**:
```json
{
  "chapter": {
    "chapter_no": 1,
    "chapter_name": "Introduction to Science",
    "total_days": 10,
    "total_subtopics": 5
  },
  "topics": [
    {
      "topic_name": "Basic Concepts",
      "subtopics": [
        {
          "sub_topic": "Definition of Science",
          "lec_required": 2,
          "sequence_order": 1
        }
      ]
    }
  ]
}
```

**Example Request**:
```
GET /curriculum/get_chapter_content.php?class_subject_id=5&chapter_no=1
Authorization: Bearer {token}
```

---

### 3. POST /curriculum/assign_chapter.php
**Purpose**: Assign a chapter to user with automatic planned date scheduling

**Request Body**:
```json
{
  "class_subject_id": 5,
  "chapter_no": 1,
  "start_date": "2024-03-15"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Chapter assigned successfully with planned dates"
}
```

**Logic**: 
- Takes start_date and lec_required for each subtopic
- Auto-generates planned_date by incrementing start_date by lec_required days
- Creates user_syllabus_progress records for each subtopic

**Example Request**:
```
POST /curriculum/assign_chapter.php
Authorization: Bearer {token}
Content-Type: application/json

{
  "class_subject_id": 5,
  "chapter_no": 1,
  "start_date": "2024-03-15"
}
```

---

### 4. GET /curriculum/get_user_chapters.php
**Purpose**: Get all chapters assigned to logged-in user with progress metrics

**Query Parameters**: None (uses authenticated user)

**Response**:
```json
[
  {
    "progress_id": 42,
    "class_subject_id": 5,
    "chapter_no": 1,
    "chapter_name": "Introduction to Science",
    "subject_name": "Science 101",
    "total_subtopics": 5,
    "completed_subtopics": 2,
    "assigned_date": "2024-03-01T10:30:15Z"
  }
]
```

**Example Request**:
```
GET /curriculum/get_user_chapters.php
Authorization: Bearer {token}
```

---

### 5. GET /curriculum/get_chapter_progress.php
**Purpose**: Get detailed progress view for a chapter with planned vs actual dates

**Query Parameters**:
- `class_subject_id` (required, int)
- `chapter_no` (required, int)

**Response**:
```json
{
  "chapter": {
    "chapter_no": 1,
    "chapter_name": "Introduction to Science",
    "class_subject_id": 5
  },
  "topics": [
    {
      "topic_name": "Basic Concepts",
      "subtopics": [
        {
          "sub_topic": "Definition of Science",
          "lec_required": 2,
          "sequence_order": 1,
          "planned_date": "2024-03-15",
          "completed_date": "2024-03-17",
          "status": "completed"
        }
      ]
    }
  ]
}
```

**Example Request**:
```
GET /curriculum/get_chapter_progress.php?class_subject_id=5&chapter_no=1
Authorization: Bearer {token}
```

---

### 6. POST /curriculum/complete_subtopic.php
**Purpose**: Mark a subtopic as completed

**Request Body**:
```json
{
  "class_subject_id": 5,
  "chapter_no": 1,
  "topic": "Basic Concepts",
  "sub_topic": "Definition of Science"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Subtopic marked as complete"
}
```

**Example Request**:
```
POST /curriculum/complete_subtopic.php
Authorization: Bearer {token}
Content-Type: application/json

{
  "class_subject_id": 5,
  "chapter_no": 1,
  "topic": "Basic Concepts",
  "sub_topic": "Definition of Science"
}
```

---

## Frontend Data Flow

1. **Component Renders**: UserLessonPlans.js shows assigned subjects
2. **User Selects Subject**: Calls `/curriculum/list_chapters.php?class_subject_id=X`
3. **User Selects Chapter**: Calls `/curriculum/get_chapter_content.php?class_subject_id=X&chapter_no=Y`
4. **User Clicks "Assign Chapter"**: Opens modal with date picker
5. **User Submits**: POSTs to `/curriculum/assign_chapter.php` with start_date
6. **Backend Creates Progress Records**: Automatically calculates planned_date for each subtopic
7. **User Views "My Chapters"**: Shows `/curriculum/get_user_chapters.php` with progress bars
8. **User Marks Complete**: POSTs to `/curriculum/complete_subtopic.php` for each finished subtopic

---

## Setup Instructions

1. **Create the user_syllabus_progress table**:
   ```sql
   -- Run the SQL from USER_SYLLABUS_PROGRESS_TABLE.sql in phpMyAdmin
   ```

2. **Upload API endpoints** to the server at `/api/curriculum/`:
   - list_chapters.php
   - get_chapter_content.php
   - assign_chapter.php
   - get_user_chapters.php
   - get_chapter_progress.php
   - complete_subtopic.php

3. **Populate the syllabus table** with curriculum data (chapter_no, topic, sub_topic, lec_required, etc.)

4. **Update UserLessonPlans.js** to use these endpoints for navigation

---

## Key Implementation Notes

- **Planned Date Calculation**: When assigning a chapter, the system increments the start_date by `lec_required` days for each subtopic in sequence
- **Progress Tracking**: User can mark individual subtopics as completed via complete_subtopic.php
- **Course Structure**: User → User has Class-Subject → Subject has Chapters → Chapters have Topics → Topics have Subtopics
- **Authentication**: All endpoints require valid Bearer token from login

