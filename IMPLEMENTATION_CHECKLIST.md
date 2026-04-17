# Classes & Subjects Management - Implementation Checklist

## ✅ Completed Components

### API Endpoints (13 endpoints total)
- [x] `/classes/create_class.php` - Create new classes
- [x] `/classes/list_classes.php` - List all classes
- [x] `/classes/delete_class.php` - Delete classes
- [x] `/classes/create_subject.php` - Create new subjects
- [x] `/classes/list_subjects.php` - List all subjects
- [x] `/classes/delete_subject.php` - Delete subjects
- [x] `/classes/create_class_subject.php` - Link subjects to classes
- [x] `/classes/list_class_subjects.php` - Get subjects for a class
- [x] `/classes/delete_class_subject.php` - Unlink subjects from classes
- [x] `/classes/create_user_class_subject.php` - Assign users to class+subject
- [x] `/classes/list_user_class_subjects.php` - Get user's assignments
- [x] `/classes/delete_user_class_subject.php` - Revoke user access
- [x] `/classes/list_all_users.php` - List users for assignment

### React Native Admin Screens
- [x] `AdminClassesScreen.js` - Create/list/delete classes
- [x] `AdminSubjectsScreen.js` - Create/list/delete subjects
- [x] `AdminUserAccessScreen.js` - Assign users to class+subject combos
- [x] Updated `AdminDashboard.js` with new menu items and routing

### Documentation
- [x] `DATABASE_CLASSES_SUBJECTS.sql` - Database schema with tables and constraints
- [x] `API_CLASSES_SUBJECTS_DOCUMENTATION.md` - Complete API reference

## 📋 Next Steps to Deploy

### Step 1: Deploy Database Schema
1. Connect to your Hostinger MySQL database
2. Execute the SQL from `DATABASE_CLASSES_SUBJECTS.sql`:
   - Creates `classes` table
   - Creates `subjects` table
   - Creates `class_subjects` junction table
   - Creates `user_class_subjects` access control table
   - Adds indexes and foreign key constraints

### Step 2: Verify API Endpoints
1. Ensure all PHP files in `/api/classes/` directory are uploaded to Hostinger
2. Test endpoints using Postman or similar:
   ```bash
   # Test create class
   POST https://indiangroupofschools.com/tasks-app/api/classes/create_class.php
   Headers: Authorization: Bearer <your-admin-token>
   Body: {"name": "Test Class", "description": "Test"}
   
   # Test list classes
   GET https://indiangroupofschools.com/tasks-app/api/classes/list_classes.php
   Headers: Authorization: Bearer <your-admin-token>
   ```

### Step 3: Test Mobile App
1. Run in Expo:
   ```bash
   expo start
   expo run:android  # or :ios or --web
   ```
2. Navigate to Admin Dashboard
3. Click menu → Classes, Subjects, or User Access
4. Test create, list, and delete operations
5. Test user assignments

### Step 4: Verify Features
- [ ] Create a new class with name and description
- [ ] Create subjects
- [ ] Link subjects to classes
- [ ] Assign users to class+subject combinations
- [ ] Verify deletion cascades work:
  - Delete class → removes linked subjects and user assignments
  - Delete class-subject → removes user assignments
  - Delete subject → removes from all classes and user assignments

## 🔑 Key Features

### Classes Management (`AdminClassesScreen.js`)
- Create classes with optional descriptions
- View all classes with creation dates
- Delete classes (cascade deletes dependent data)
- Admin-only access

### Subjects Management (`AdminSubjectsScreen.js`)
- Create subjects with optional descriptions
- View all subjects with creation dates
- Delete subjects (cascade deletes dependent data)
- Admin-only access

### User Access Control (`AdminUserAccessScreen.js`)
- View all classes and their assigned subjects
- Assign multiple users to any class-subject combination
- Modal interface for user selection
- Each user can only be assigned once per class-subject combo
- Shows all users in the system for selection

## 🔐 Security Notes
- All endpoints require admin authentication (role check)
- All SQL queries use parameterized statements (no SQL injection)
- Cascade delete prevents orphaned records
- Bearer token authentication required

## 📁 File Locations
```
api (2)/
├── classes/
│   ├── create_class.php
│   ├── list_classes.php
│   ├── delete_class.php
│   ├── create_subject.php
│   ├── list_subjects.php
│   ├── delete_subject.php
│   ├── create_class_subject.php
│   ├── list_class_subjects.php
│   ├── delete_class_subject.php
│   ├── create_user_class_subject.php
│   ├── list_user_class_subjects.php
│   ├── delete_user_class_subject.php
│   └── list_all_users.php

React Native Components (Root):
├── AdminClassesScreen.js
├── AdminSubjectsScreen.js
├── AdminUserAccessScreen.js
├── AdminDashboard.js (updated)

Database & Docs:
├── DATABASE_CLASSES_SUBJECTS.sql
└── API_CLASSES_SUBJECTS_DOCUMENTATION.md
```

## 🧪 Testing Checklist
- [ ] Database tables created successfully
- [ ] API endpoints accessible from Postman
- [ ] Admin can log in and access menu
- [ ] Classes screen loads and allows CRUD
- [ ] Subjects screen loads and allows CRUD
- [ ] Can link subjects to classes
- [ ] User Access screen shows all classes and subjects
- [ ] Can select and assign multiple users
- [ ] User assignments appear in list
- [ ] Delete operations cascade correctly
- [ ] Duplicate class/subject names are rejected (409 error)

## 🚀 Future Enhancements
- Edit class/subject names and descriptions
- Bulk user assignment
- Search/filter classes and subjects
- User role-based dashboard (show only assigned classes)
- Form/task creation linked to specific classes
- Attendance tracking by class
