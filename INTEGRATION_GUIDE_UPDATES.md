// Example: How to integrate update checking into your App.js

import { useEffect, useState } from 'react';
import { updateService } from './services/updateService';
import { UpdateAvailableModal } from './components/UpdateAvailableModal';
import apiConfig from './apiConfig';

// In your App.js or main navigation component:

export default function App() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    // Check if enough time has passed since last check (throttle)
    const shouldCheck = await updateService.shouldCheckForUpdates(1440); // Check once per day
    if (!shouldCheck) return;

    // Check for available updates
    const update = await updateService.checkForUpdates(apiConfig.API_BASE);
    
    if (update?.updateAvailable) {
      setUpdateInfo(update);
      setShowUpdateModal(true);
      await updateService.saveLastUpdateCheckTime();
    }
  };

  const handleUpdatePress = async () => {
    // For native apps, this opens the app store
    // For web, it reloads the page
    await updateService.openAppStore();
  };

  return (
    <>
      {/* Your existing app content */}
      
      {/* Update modal */}
      <UpdateAvailableModal
        visible={showUpdateModal}
        updateInfo={updateInfo}
        onDismiss={() => setShowUpdateModal(false)}
        onUpdate={handleUpdatePress}
      />
    </>
  );
}
