# Classes & Subjects Management API - Complete Endpoints

## Overview
This API provides complete CRUD operations for managing classes, subjects, and user access control within the checklist app.

## Database Tables
- `classes`: id, name, description, created_at
- `subjects`: id, name, description, created_at
- `class_subjects`: class_subject_id (PK), class_id (FK), subject_id (FK), created_at
- `user_class_subjects`: id, user_id (FK), class_subject_id (FK), assigned_at

All endpoints require admin authentication (Bearer token with role='admin').

## Class Endpoints

### 1. Create Class
**POST** `/classes/create_class.php`
```json
Request Body:
{
  "name": "Class 10A",
  "description": "Advanced Mathematics Course"
}

Response (Success):
{
  "success": true,
  "id": 5
}

Response (Duplicate Name Error):
{
  "error": "Class name already exists"
}
```

### 2. List Classes
**GET** `/classes/list_classes.php`
```json
Response:
[
  {
    "id": 1,
    "name": "Class 10A",
    "description": "Advanced Mathematics",
    "created_at": "2024-01-15 10:30:00"
  }
]
```

### 3. Delete Class
**DELETE** `/classes/delete_class.php?id=5`
```json
Response:
{
  "success": true
}
```

## Subject Endpoints

### 4. Create Subject
**POST** `/classes/create_subject.php`
```json
Request Body:
{
  "name": "Mathematics",
  "description": "Core mathematics curriculum"
}

Response (Success):
{
  "success": true,
  "id": 3
}
```

### 5. List Subjects
**GET** `/classes/list_subjects.php`
```json
Response:
[
  {
    "id": 1,
    "name": "Mathematics",
    "description": "Core curriculum",
    "created_at": "2024-01-15 09:00:00"
  }
]
```

### 6. Delete Subject
**DELETE** `/classes/delete_subject.php?id=3`
```json
Response:
{
  "success": true
}
```

## Class-Subject Relationship Endpoints

### 7. Create Class-Subject Mapping
**POST** `/classes/create_class_subject.php`
Assigns a subject to a class.
```json
Request Body:
{
  "class_id": 1,
  "subject_id": 2
}

Response (Success):
{
  "success": true,
  "class_subject_id": 15
}

Response (Already Exists):
{
  "error": "Subject already assigned to this class"
}
```

### 8. List Class Subjects
**GET** `/classes/list_class_subjects.php?class_id=1`
Gets all subjects assigned to a specific class.
```json
Response:
[
  {
    "class_subject_id": 15,
    "class_id": 1,
    "subject_id": 2,
    "subject_name": "Mathematics",
    "subject_description": "Core curriculum",
    "created_at": "2024-01-15 11:00:00"
  }
]
```

### 9. Delete Class-Subject Mapping
**DELETE** `/classes/delete_class_subject.php?id=15`
Removes a subject from a class.
```json
Response:
{
  "success": true
}
```

## User Access Control Endpoints

### 10. Create User-Class-Subject Assignment
**POST** `/classes/create_user_class_subject.php`
Assigns a user to a specific class+subject combination.
```json
Request Body:
{
  "user_id": 42,
  "class_subject_id": 15
}

Response (Success):
{
  "success": true,
  "id": 8
}

Response (Already Assigned):
{
  "error": "User already assigned to this class-subject"
}
```

### 11. List User Assignments
**GET** `/classes/list_user_class_subjects.php?user_id=42`
Gets all classes and subjects assigned to a specific user.
```json
Response:
[
  {
    "id": 8,
    "user_id": 42,
    "class_subject_id": 15,
    "class_id": 1,
    "class_name": "Class 10A",
    "subject_id": 2,
    "subject_name": "Mathematics",
    "assigned_at": "2024-01-15 12:00:00"
  }
]
```

### 12. Delete User Assignment
**DELETE** `/classes/delete_user_class_subject.php?id=8`
Revokes a user's access to a class+subject combination.
```json
Response:
{
  "success": true
}
```

### 13. List All Users
**GET** `/classes/list_all_users.php`
Gets all users in the system (for assignment selection).
```json
Response:
[
  {
    "id": 1,
    "username": "john_teacher",
    "email": "john@school.com",
    "role": "admin"
  },
  {
    "id": 42,
    "username": "sarah_teacher",
    "email": "sarah@school.com",
    "role": "user"
  }
]
```

## Admin UI Screens (React Native)

### AdminClassesScreen.js
- Lists all classes
- Create new classes with name and optional description
- Delete classes (with confirmation)
- Shows creation date for each class

### AdminSubjectsScreen.js
- Lists all subjects
- Create new subjects with name and optional description
- Delete subjects (with confirmation)
- Shows creation date for each subject

### AdminUserAccessScreen.js
- Displays classes with their assigned subjects
- Click "Assign Users" on any class-subject combo
- Modal to select multiple users to assign
- Assign multiple users at once to the same class+subject

## Integration Guide

1. **Database Migration**: Execute DATABASE_CLASSES_SUBJECTS.sql on the server database
2. **API Endpoints**: All PHP files are in `/api/classes/` directory
3. **Admin Menu**: Updated AdminDashboard.js automatically includes menu items for:
   - Classes
   - Subjects
   - User Access
4. **Authentication**: All endpoints check admin role; ensure auth tokens are properly set

## Error Handling
All endpoints return HTTP status codes:
- 200: Success
- 400: Bad request (missing parameters)
- 403: Forbidden (not admin)
- 409: Conflict (duplicate entry)
- 500: Server error

## Notes
- All timestamps use MySQL DATETIME format
- Cascade delete: Deleting a class removes all related class_subjects and user assignments
- Cascade delete: Deleting a class_subject removes all related user assignments
- All endpoints use parameterized queries to prevent SQL injection
