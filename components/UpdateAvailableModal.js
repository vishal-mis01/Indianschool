import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Dialog, Button, Surface } from 'react-native-paper';
import { updateService } from '../services/updateService';

export const UpdateAvailableModal = ({ visible, updateInfo, onDismiss, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!updateInfo) return null;

  const handleUpdatePress = async () => {
    setIsLoading(true);
    
    if (onUpdate) {
      // Call custom update handler if provided
      await onUpdate();
    } else {
      // Default: open app store
      await updateService.openAppStore();
    }
    
    setIsLoading(false);
  };

  const handleDismiss = () => {
    // Don't allow dismissal if update is required
    if (!updateInfo.isRequired) {
      onDismiss();
    }
  };

  return (
    <Dialog visible={visible} onDismiss={handleDismiss}>
      <Dialog.Title style={styles.title}>
        {updateInfo.isRequired ? '⚠️ Update Required' : '✨ Update Available'}
      </Dialog.Title>

      <Dialog.Content>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          <Text style={styles.versionText}>
            Version {updateInfo.latestVersion} is available
          </Text>

          {updateInfo.releaseNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's New</Text>
              <Text style={styles.releaseNotes}>
                {updateInfo.releaseNotes}
              </Text>
            </View>
          )}

          {updateInfo.changes && updateInfo.changes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Changes</Text>
              {updateInfo.changes.map((change, idx) => (
                <Text key={idx} style={styles.changeItem}>
                  • {change}
                </Text>
              ))}
            </View>
          )}

          {updateInfo.isRequired && (
            <View style={styles.requiredWarning}>
              <Text style={styles.warningText}>
                This update is required to continue using the app. Please update now.
              </Text>
            </View>
          )}
        </ScrollView>
      </Dialog.Content>

      <Dialog.Actions style={styles.actions}>
        {!updateInfo.isRequired && (
          <Button
            onPress={handleDismiss}
            disabled={isLoading}
            style={styles.dismissButton}
          >
            Later
          </Button>
        )}
        <Button
          onPress={handleUpdatePress}
          loading={isLoading}
          mode="contained"
          style={styles.updateButton}
        >
          {isLoading ? 'Opening...' : 'Update Now'}
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  content: {
    maxHeight: 300,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  releaseNotes: {
    fontSize: 13,
    lineHeight: 20,
    color: '#555',
  },
  changeItem: {
    fontSize: 13,
    lineHeight: 18,
    color: '#555',
    marginBottom: 4,
  },
  requiredWarning: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 12,
    borderRadius: 4,
    marginTop: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
  },
  actions: {
    justifyContent: 'flex-end',
    paddingRight: 8,
  },
  dismissButton: {
    marginRight: 8,
  },
  updateButton: {
    paddingHorizontal: 24,
  },
});
