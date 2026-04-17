# In-App Update System - Complete Guide

## Overview

This in-app update system allows you to notify users about app updates and direct them to download new versions. It includes:

1. **Update Check Service** - Compares app version with server version
2. **Update Modal UI** - Shows update info and prompts user to update
3. **Backend API** - Manages version information in database
4. **Admin Dashboard** - Interface for creating/managing releases

## Architecture

```
App.js (checks for updates on launch)
  ↓
updateService.checkForUpdates()
  ↓
check_app_version.php (API endpoint)
  ↓
app_versions table (stores release info)
  ↓
UpdateAvailableModal (displays to user)
  ↓
updateService.openAppStore() (opens store or reloads web)
```

## Components

### 1. UpdateService (`services/updateService.js`)

Helper library with these key methods:

#### `getCurrentVersion()`
Gets the current app version from `app.json` manifest.

```javascript
const version = updateService.getCurrentVersion();
// Returns: "1.2.3"
```

#### `checkForUpdates(apiBaseUrl)`
Contacts server to check if update is available.

```javascript
const updateInfo = await updateService.checkForUpdates('http://localhost:3001/api');

// Returns:
{
  updateAvailable: true,
  latestVersion: "1.3.0",
  downloadUrl: "https://plays.google.com/...",
  releaseNotes: "Bug fixes and improvements",
  isRequired: false,
  changes: ["Fixed login issue", "Improved performance"]
}
```

#### `compareVersions(v1, v2)`
Compares two semantic version strings.

```javascript
updateService.compareVersions("1.0.0", "1.1.0"); // Returns: -1 (v1 is older)
updateService.compareVersions("2.0.0", "1.9.0"); // Returns: 1 (v1 is newer)
```

#### `shouldCheckForUpdates(intervalMinutes)`
Throttles update checks to avoid excessive API calls.

```javascript
const shouldCheck = await updateService.shouldCheckForUpdates(1440); // Check once per day
if (shouldCheck) {
  await updateService.checkForUpdates(apiUrl);
  await updateService.saveLastUpdateCheckTime();
}
```

#### `openAppStore()`
Opens the appropriate app store based on platform.

```javascript
// iOS: Opens App Store
// Android: Opens Google Play
// Web: Reloads the page
await updateService.openAppStore();
```

### 2. UpdateAvailableModal (`components/UpdateAvailableModal.js`)

React Native Modal component that displays update information and prompts user.

**Props:**
- `visible` (bool) - Show/hide modal
- `updateInfo` (object) - Update details from checkForUpdates
- `onDismiss` (function) - Called when user clicks "Later"
- `onUpdate` (function) - Custom handler for update button

**Features:**
- Shows release notes and changes
- Displays "Update Required" warning if critical
- Disables "Later" button for required updates
- Loading state while opening store

```javascript
<UpdateAvailableModal
  visible={showUpdateModal}
  updateInfo={updateInfo}
  onDismiss={() => setShowUpdateModal(false)}
  onUpdate={() => updateService.openAppStore()}
/>
```

### 3. API Endpoints

#### `check_app_version.php` (GET)

Client calls this to check for updates.

**Request Headers:**
```
X-App-Version: 1.0.0
X-Platform: ios|android|web
```

**Response:**
```json
{
  "update_available": true,
  "latest_version": "1.1.0",
  "current_version": "1.0.0",
  "is_required": false,
  "release_notes": "Bug fixes and new features",
  "changes": ["Fixed login", "Improved performance"],
  "download_url": "https://...",
  "platform": "android"
}
```

#### `admin_manage_app_versions.php` (POST/GET)

Admin endpoint to manage version releases.

**Actions:**

##### List all versions
```bash
GET /api/admin_manage_app_versions.php?action=list
```

Response:
```json
{
  "success": true,
  "versions": [
    {
      "id": 1,
      "version": "1.1.0",
      "platform": "android",
      "release_notes": "...",
      "changes": ["..."],
      "is_required": false,
      "is_active": true,
      "released_at": "2026-03-06 10:30:00"
    }
  ]
}
```

##### Create new version
```bash
POST /api/admin_manage_app_versions.php

Parameters:
- action=create
- version=1.1.0 (required)
- platform=android|ios|web (required)
- release_notes=... (optional)
- changes=["fix1", "fix2"] (optional, JSON or array)
- is_required=true|false (optional)
- download_url=... (optional)
```

When creating a new version, all previous versions for that platform are automatically deactivated.

Response:
```json
{
  "success": true,
  "message": "Version 1.1.0 created for android",
  "version": {
    "id": 2,
    "version": "1.1.0",
    "platform": "android",
    "is_required": false,
    "is_active": true
  }
}
```

##### Update version details
```bash
POST /api/admin_manage_app_versions.php

Parameters:
- action=update
- id=2 (required)
- release_notes=... (optional)
- is_required=true|false (optional)
- download_url=... (optional)
- changes=... (optional)
```

##### Deactivate version
```bash
POST /api/admin_manage_app_versions.php

Parameters:
- action=deactivate
- id=2
```

##### Delete version
```bash
POST /api/admin_manage_app_versions.php

Parameters:
- action=delete
- id=2
```

## Implementation Steps

### Step 1: Update your App.js

Add update checking on app startup:

```javascript
import { useEffect, useState } from 'react';
import { updateService } from './services/updateService';
import { UpdateAvailableModal } from './components/UpdateAvailableModal';
import apiConfig from './apiConfig';

export default function App() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Load user session, etc.
    // ...

    // Check for updates (once per day, configurable)
    await checkForUpdates();
  };

  const checkForUpdates = async () => {
    const shouldCheck = await updateService.shouldCheckForUpdates(1440);
    if (!shouldCheck) return;

    const update = await updateService.checkForUpdates(apiConfig.API_BASE);
    if (update?.updateAvailable) {
      setUpdateInfo(update);
      setShowUpdateModal(true);
    }
    await updateService.saveLastUpdateCheckTime();
  };

  return (
    <>
      {/* Your existing app */}
      
      <UpdateAvailableModal
        visible={showUpdateModal}
        updateInfo={updateInfo}
        onDismiss={() => setShowUpdateModal(false)}
        onUpdate={() => updateService.openAppStore()}
      />
    </>
  );
}
```

### Step 2: Update app.json version

Whenever you release a new version, update `package.json` and `app.json`:

```json
{
  "expo": {
    "name": "Checklist App",
    "version": "1.1.0",
    ...
  }
}
```

### Step 3: Configure App Store URLs

In `updateService.js`, update the app store URLs:

```javascript
// iOS
await Linking.openURL('https://apps.apple.com/app/YOUR_APP_NAME/id000000000');

// Android
await Linking.openURL('https://play.google.com/store/apps/details?id=com.yourcompany.app');
```

### Step 4: Create admin interface (optional)

Create an admin screen to manage releases without direct API calls:

```javascript
// AdminVersionManagementScreen.js

const [versions, setVersions] = useState([]);
const [createMode, setCreateMode] = useState(false);

const loadVersions = async () => {
  const response = await apiFetch('/admin_manage_app_versions.php?action=list');
  setVersions(response.versions);
};

const createVersion = async (formData) => {
  const formBody = new FormData();
  formBody.append('action', 'create');
  formBody.append('version', formData.version);
  formBody.append('platform', formData.platform);
  formBody.append('release_notes', formData.releaseNotes);
  formBody.append('changes', JSON.stringify(formData.changes));
  formBody.append('is_required', formData.isRequired);

  const response = await apiFetch('/admin_manage_app_versions.php', {
    method: 'POST',
    body: formBody
  });
  
  if (response.success) {
    // Show success message
    // Refresh versions list
    loadVersions();
  }
};
```

## Usage Examples

### Example 1: Simple update check on app startup

```javascript
useEffect(() => {
  const checkUpdate = async () => {
    const update = await updateService.checkForUpdates(apiConfig.API_BASE);
    if (update?.updateAvailable) {
      Alert.alert(
        'Update Available',
        `Version ${update.latestVersion} is available. Update now?`,
        [
          { text: 'Later', onPress: () => {} },
          { 
            text: 'Update', 
            onPress: () => updateService.openAppStore() 
          }
        ]
      );
    }
  };
  checkUpdate();
}, []);
```

### Example 2: Periodic update checks (every hour)

```javascript
useEffect(() => {
  const interval = setInterval(async () => {
    const shouldCheck = await updateService.shouldCheckForUpdates(60); // 60 minutes
    if (shouldCheck) {
      const update = await updateService.checkForUpdates(apiConfig.API_BASE);
      if (update?.updateAvailable) {
        setUpdateInfo(update);
        setShowUpdateModal(true);
      }
      await updateService.saveLastUpdateCheckTime();
    }
  }, 5 * 60 * 1000); // Check every 5 minutes if time has elapsed

  return () => clearInterval(interval);
}, []);
```

### Example 3: Required update enforcement

```javascript
// If update is required, disable the rest of app
{!showUpdateModal && updateInfo?.isRequired ? (
  <View style={{ flex: 1, justifyContent: 'center' }}>
    <Text style={{ textAlign: 'center', fontSize: 16, marginBottom: 20 }}>
      This update is required to use the app.
    </Text>
    <Button onPress={() => updateService.openAppStore()}>
      Update Now
    </Button>
  </View>
) : (
  <YourMainApp />
)}
```

## Creating a Release

### Via API (curl example)

```bash
curl -X POST http://localhost:3001/api/admin_manage_app_versions.php \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -F "action=create" \
  -F "version=1.1.0" \
  -F "platform=android" \
  -F "release_notes=Bug fixes and improvements" \
  -F "changes=[\"Fixed login issue\",\"Improved performance\"]" \
  -F "is_required=false" \
  -F "download_url=https://play.google.com/store/apps/details?id=..."
```

### Database structure

The system automatically creates the `app_versions` table:

```sql
CREATE TABLE app_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  version VARCHAR(20) UNIQUE NOT NULL,
  platform VARCHAR(20) NOT NULL,  -- 'web', 'ios', 'android'
  release_notes LONGTEXT,
  changes JSON,                    -- Array of change strings
  is_required BOOLEAN DEFAULT FALSE,
  download_url VARCHAR(500),
  released_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_version (version),
  INDEX idx_platform (platform)
);
```

## Best Practices

1. **Version Format**: Use semantic versioning (MAJOR.MINOR.PATCH)
   - 1.0.0 - Initial release
   - 1.1.0 - New features
   - 1.0.1 - Bug fixes

2. **Update Frequency**: Check for updates:
   - On app startup (every session)
   - Periodically while app is running (once per hour)
   - Don't check too frequently (use throttling)

3. **Required Updates**: Only mark updates as required if:
   - There's a critical security fix
   - Database schema changed incompatibly
   - API endpoints changed
   - Otherwise, let users update at their convenience

4. **Release Notes**: Write clear, user-friendly notes:
   - ✅ "Fixed app crash on login"
   - ❌ "Fixed NPE in AuthService.validateToken()"

5. **Testing**: Before marking active:
   - Test on real devices
   - Verify all changes are backward compatible
   - Check database migrations

## Troubleshooting

**Updates not showing?**
- Check if version in `app.json` is actually older
- Verify `app_versions` record is `is_active = TRUE`
- Check platform matches (web/ios/android)
- Review browser console for API errors

**Modal stuck?**
- If required update, only "Update Now" button is active
- Make sure user has internet connection
- Check app store URLs are correct

**Version comparison failing?**
- Ensure versions follow semantic versioning format
- Invalid: "1", "v1.0", "1.0.0.0"
- Valid: "1.0.0", "1.1.5", "2.3.10"

## Platform-Specific Notes

### iOS (App Store)
- URL format: `https://apps.apple.com/app/{APP_NAME}/id{BUNDLE_ID}`
- Example: `https://apps.apple.com/app/checklist-app/id123456789`
- Get app ID from App Store Connect

### Android (Google Play)
- URL format: `https://play.google.com/store/apps/details?id={PACKAGE_NAME}`
- Example: `https://play.google.com/store/apps/details?id=com.checklist.app`
- Get package name from Google Play Console

### Web
- No app store needed
- Clicking update reloads the page
- Can deploy new version server-side and reload clients

---

**Last Updated**: March 6, 2026
**Status**: Production Ready
