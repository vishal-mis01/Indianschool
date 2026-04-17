# Copilot Instructions - Checklist App

## Architecture Overview

**Tech Stack**: React Native (Expo) frontend + PHP/MySQL backend
- Frontend: React Native with react-native-paper UI components, AsyncStorage for auth tokens
- Backend: PHP REST API with CORS-enabled endpoints, MySQL database
- Authentication: Bearer token stored in AsyncStorage, role-based (admin/user)

**Main App Flow**: Login (LoginScreen.js) → Dashboard (UserDashboard/AdminDashboard) → Feature Screens

## Core Components

### Frontend Structure
- **App.js**: Root component, handles authentication state, role-based routing
- **User Dashboard**: UserDashboard.js routes to UserTasks, UserFmsTasks, UserFormFill, UserReports
- **Admin Dashboard**: AdminDashboard.js with sidebar routing to task/form/FMS management screens
- **API Layer**: apiFetch.js (fetch wrapper with auth headers), apiConfig.js (API_BASE url)

### API Endpoints
All API calls use `apiFetch()` helper. Three main domains:
- **Tasks API**: `/submit_task.php`, `/admin_create_task_template.php`, `/admin_assign_task.php`
- **Forms API** (`/forms/`): Form CRUD, field management, submissions, responses
- **FMS API** (`/fms/`): Process workflows with steps (see fmsFormService.js)

## Key Patterns & Conventions

### Data Persistence
- Auth state: `AsyncStorage` keys are `auth_token`, `role`, `user_id`
- Form responses prefetched on login into `cached_reports`
- No Redux/Context; lift state to parent (Dashboard) or use AsyncStorage

### API Contract
- `apiFetch(path, options)` handles:
  - Bearer token injection from AsyncStorage
  - Automatic JSON stringify for object bodies
  - Special handling for FormData (no Content-Type header)
  - CORS mode + credentials: omit
- Error handling: Check `res.ok`, catch HTML responses (server errors return HTML)
- Empty response returns `{ success: true }`

### UI Patterns
- react-native-paper (Surface, Button, Text components)
- Responsive: Check `useWindowDimensions().width > 768` for web vs mobile
- LinearGradient for backgrounds (LoginScreen.js)
- Tab/nav implemented via state (active state) in dashboards

## Development Workflow

### Installation & Running
```bash
npm install
expo start              # Start Expo server
expo run:android       # Run on Android
expo run:ios          # Run on iOS
expo start --web      # Run web version (via webpack)
```

### Environment
- API_BASE: `http://localhost:3001/api` in development (proxy in package.json to indiangroupofschools.com)
- Fetch credentials explicitly set to `omit` to avoid CORS cookie issues
- CORS headers required on all PHP endpoints (see api/config.php)

### Critical Implementation Notes
- **FormData uploads**: Never set Content-Type header; browser sets boundary
- **Role routing**: Always check `user.role === 'admin'` for access control (no guard on backend yet)
- **State lifting**: Forms state lives in parent (UserDashboard/AdminDashboard), not child screens
- **Async initialization**: Auth check happens on App mount before rendering (loading state)

## File Organization

- **Admin screens**: `Admin*Screen.js` and `Admin*.js` (99+ files currently)
- **User screens**: `User*.js` (forms, tasks, reports)
- **Services**: `*Service.js` (e.g., fmsFormService.js with action creators)
- **API logic**: `/api (2)/` folder with separate subdirs for forms, fms, main endpoints

## Common Pitfalls

1. **CORS errors**: Ensure all PHP endpoints send CORS headers immediately (see config.php)
2. **Empty responses**: API may return empty string; apiFetch handles this
3. **HTML error pages**: Check console logs when server returns HTML instead of JSON
4. **Auth state**: Always use AsyncStorage for persistence; component state resets on reload
5. **Responsive design**: Test web layout manually; use `width > 768` breakpoint

## Reference Examples
- Form submission: [UserFormFill.js](UserFormFill.js) shows full form fill + submit flow
- Task management: [UserTasks.js](UserTasks.js) for checklist interactions
- FMS workflows: [FmsFormScreen.js](FmsFormScreen.js) integrates form submission with process instances
