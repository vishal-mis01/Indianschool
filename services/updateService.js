import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiFetch } from '../apiFetch';

export const updateService = {
  /**
   * Get current app version from app.json manifest
   */
  getCurrentVersion: () => {
    return Constants.expoConfig?.version || '1.0.0';
  },

  /**
   * Check for available updates from server
   */
  checkForUpdates: async (apiBaseUrl) => {
    try {
      const currentVersion = updateService.getCurrentVersion();
      const response = await fetch(`${apiBaseUrl}/check_app_version.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Version': currentVersion,
          'X-Platform': Platform.OS,
        },
      });

      if (!response.ok) {
        console.error('Version check failed:', response.status);
        return null;
      }

      const data = await response.json();
      
      // Check if update is available
      if (data.update_available && updateService.compareVersions(currentVersion, data.latest_version) < 0) {
        return {
          updateAvailable: true,
          latestVersion: data.latest_version,
          downloadUrl: data.download_url,
          releaseNotes: data.release_notes,
          isRequired: data.is_required || false,
          changes: data.changes || [],
        };
      }

      return {
        updateAvailable: false,
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return null;
    }
  },

  /**
   * Compare two semantic versions
   * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  compareVersions: (v1, v2) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  },

  /**
   * Check if minimum version requirement is met
   */
  isMinimumVersionMet: (currentVersion, minimumVersion) => {
    return updateService.compareVersions(currentVersion, minimumVersion) >= 0;
  },

  /**
   * Get update check history
   */
  getLastUpdateCheckTime: async () => {
    const lastCheck = await AsyncStorage.getItem('last_update_check');
    return lastCheck ? new Date(JSON.parse(lastCheck)) : null;
  },

  /**
   * Save last update check time
   */
  saveLastUpdateCheckTime: async () => {
    await AsyncStorage.setItem('last_update_check', JSON.stringify(new Date().toISOString()));
  },

  /**
   * Should check for updates (throttle to once per session or once per 24h)
   */
  shouldCheckForUpdates: async (checkIntervalMinutes = 1440) => {
    const lastCheck = await updateService.getLastUpdateCheckTime();
    if (!lastCheck) return true;

    const minutesElapsed = (Date.now() - lastCheck.getTime()) / (1000 * 60);
    return minutesElapsed >= checkIntervalMinutes;
  },

  /**
   * Open app store/play store for update
   */
  openAppStore: async () => {
    const { Linking } = require('react-native');
    const platform = Platform.OS;

    try {
      if (platform === 'ios') {
        // Open iOS App Store
        // Replace with your actual app ID from App Store
        await Linking.openURL('https://apps.apple.com/app/YOUR_APP_NAME/id000000000');
      } else if (platform === 'android') {
        // Open Google Play Store
        // Replace with your actual package name from Google Play
        await Linking.openURL('https://play.google.com/store/apps/details?id=com.yourcompany.app');
      } else if (platform === 'web') {
        // For web, you could reload the page or show update available
        window.location.reload();
      }
    } catch (error) {
      console.error('Error opening app store:', error);
    }
  },

  /**
   * Format release notes or changes into readable text
   */
  formatReleaseNotes: (changes) => {
    if (Array.isArray(changes)) {
      return changes.map(change => `• ${change}`).join('\n');
    }
    return changes || '';
  },
};
