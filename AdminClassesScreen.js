import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Text,
  useWindowDimensions,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Button, TextInput, Surface, MD3Colors } from 'react-native-paper';
import apiFetch from './apiFetch';
import { ADMIN_BUTTON_MAX_WIDTH } from './adminConfig';

export default function AdminClassesScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setRefreshing(true);
    try {
      const data = await apiFetch('/classes/list_classes.php', { method: 'GET' });
      if (Array.isArray(data)) {
        setClasses(data);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load classes');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Class name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch('/classes/create_class.php', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
        }),
      });

      if (result.success) {
        Alert.alert('Success', 'Class created');
        setFormData({ name: '', description: '' });
        loadClasses();
      } else {
        Alert.alert('Error', result.error || 'Failed to create class');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (classId) => {
    Alert.alert('Confirm', 'Delete this class?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            const result = await apiFetch(`/classes/delete_class.php?id=${classId}`, {
              method: 'DELETE',
            });
            if (result.success) {
              Alert.alert('Success', 'Class deleted');
              loadClasses();
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to delete class');
          }
        },
      },
    ]);
  };

  const renderClassItem = ({ item }) => (
    <Surface
      style={{
        padding: 12,
        marginHorizontal: isMobile ? 0 : 8,
        marginVertical: 8,
        borderRadius: 8,
        backgroundColor: '#fff',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
          {item.description && (
            <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{item.description}</Text>
          )}
          <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            Created: {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Button
          mode="outlined"
          compact
          textColor="red"
          onPress={() => handleDelete(item.id)}
          style={{ marginLeft: 8, maxWidth: ADMIN_BUTTON_MAX_WIDTH }}
        >
          Delete
        </Button>
      </View>
    </Surface>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      contentContainerStyle={{ padding: isMobile ? 0 : 16 }}
      refreshControl={isMobile ? <RefreshControl refreshing={refreshing} onRefresh={loadClasses} /> : null}
    >
      {/* Create Form */}
      <Surface style={{ padding: 16, marginHorizontal: isMobile ? 0 : 8, marginVertical: 8, borderRadius: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Create New Class</Text>
        <TextInput
          label="Class Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          mode="outlined"
          style={{ marginBottom: 12, maxWidth: 500 }}
        />
        <TextInput
          label="Description"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={{ marginBottom: 12, maxWidth: 500 }}
        />
        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={{ maxWidth: ADMIN_BUTTON_MAX_WIDTH }}
        >
          Create Class
        </Button>
      </Surface>

      {/* Classes List */}
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginHorizontal: isMobile ? 0 : 8, marginTop: 16 }}>
        All Classes ({classes.length})
      </Text>
      <FlatList
        data={classes}
        renderItem={renderClassItem}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No classes yet</Text>
        }
      />
    </ScrollView>
  );
}
