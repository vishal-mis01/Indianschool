import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Text,
  useWindowDimensions,
  FlatList,
  Modal,
} from 'react-native';
import { Button, TextInput, Surface, Switch } from 'react-native-paper';
import apiFetch from './apiFetch';
import { ADMIN_BUTTON_MAX_WIDTH } from './adminConfig';

export default function AdminSubjectsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '', has_activities: false });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setRefreshing(true);
    try {
      const data = await apiFetch('/classes/list_subjects.php', { method: 'GET' });
      if (Array.isArray(data)) {
        setSubjects(data);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load subjects');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Subject name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch('/classes/create_subject.php', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          has_activities: formData.has_activities,
        }),
      });

      if (result.success) {
        Alert.alert('Success', 'Subject created');
        setFormData({ name: '', description: '', has_activities: false });
        loadSubjects();
      } else {
        Alert.alert('Error', result.error || 'Failed to create subject');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (subjectId) => {
    Alert.alert('Confirm', 'Delete this subject?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            const result = await apiFetch(`/classes/delete_subject.php?id=${subjectId}`, {
              method: 'DELETE',
            });
            if (result.success) {
              Alert.alert('Success', 'Subject deleted');
              loadSubjects();
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to delete subject');
          }
        },
      },
    ]);
  };

  const handleEdit = (subject) => {
    setSelectedSubject(subject);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedSubject.name.trim()) {
      Alert.alert('Error', 'Subject name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch('/classes/update_subject.php', {
        method: 'POST',
        body: JSON.stringify({
          id: selectedSubject.id,
          name: selectedSubject.name,
          description: selectedSubject.description || null,
          has_activities: selectedSubject.has_activities,
        }),
      });

      if (result.success) {
        Alert.alert('Success', 'Subject updated');
        setShowEditModal(false);
        setSelectedSubject(null);
        loadSubjects();
      } else {
        Alert.alert('Error', result.error || 'Failed to update subject');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSubjectItem = ({ item }) => (
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
            Has Activities: {item.has_activities ? 'Yes' : 'No'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Button
            mode="outlined"
            compact
            onPress={() => handleEdit(item)}
            style={{ marginLeft: 8, maxWidth: ADMIN_BUTTON_MAX_WIDTH }}
          >
            Edit
          </Button>
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
      </View>
    </Surface>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      contentContainerStyle={{ padding: isMobile ? 0 : 16 }}
    >
      {/* Create Form */}
      <Surface style={{ padding: 16, marginHorizontal: isMobile ? 0 : 8, marginVertical: 8, borderRadius: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Create New Subject</Text>
        <TextInput
          label="Subject Name *"
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, maxWidth: 500 }}>
          <Text style={{ marginRight: 12 }}>Has Activities</Text>
          <Switch
            value={formData.has_activities}
            onValueChange={(value) => setFormData({ ...formData, has_activities: value })}
          />
        </View>
        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={{ maxWidth: ADMIN_BUTTON_MAX_WIDTH }}
        >
          Create Subject
        </Button>
      </Surface>

      {/* Subjects List */}
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginHorizontal: isMobile ? 0 : 8, marginTop: 16 }}>
        All Subjects ({subjects.length})
      </Text>
      <FlatList
        data={subjects}
        renderItem={renderSubjectItem}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No subjects yet</Text>
        }
      />

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Surface style={{ padding: 20, margin: 20, borderRadius: 8, width: '80%', maxWidth: 400 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Edit Subject</Text>
            <TextInput
              label="Subject Name *"
              value={selectedSubject?.name || ''}
              onChangeText={(text) => setSelectedSubject({ ...selectedSubject, name: text })}
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Description"
              value={selectedSubject?.description || ''}
              onChangeText={(text) => setSelectedSubject({ ...selectedSubject, description: text })}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={{ marginBottom: 12 }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ marginRight: 12 }}>Has Activities</Text>
              <Switch
                value={selectedSubject?.has_activities || false}
                onValueChange={(value) => setSelectedSubject({ ...selectedSubject, has_activities: value })}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button onPress={() => setShowEditModal(false)} style={{ marginRight: 8, maxWidth: ADMIN_BUTTON_MAX_WIDTH }}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleUpdate} loading={loading} disabled={loading} style={{ maxWidth: ADMIN_BUTTON_MAX_WIDTH }}>
                Update
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>
    </ScrollView>
  );
}
