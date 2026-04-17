import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Text,
  useWindowDimensions,
  FlatList,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Button, TextInput, Surface, Checkbox, Switch, ActivityIndicator, Menu } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import apiFetch from './apiFetch';
import { ADMIN_BUTTON_MAX_WIDTH } from './adminConfig';
export default function AdminUserAccessScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [classes, setClasses] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [subjects, setSubjects] = useState({});
  const [users, setUsers] = useState([]);
  const [classSubjectAssignments, setClassSubjectAssignments] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedClassForDisplay, setSelectedClassForDisplay] = useState(null);
  const [showClassMenu, setShowClassMenu] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDescription, setNewSubjectDescription] = useState('');
  const [newSubjectHasActivities, setNewSubjectHasActivities] = useState(false);
  const [creatingNewSubject, setCreatingNewSubject] = useState(false);
  const [showSyllabusUploadModal, setShowSyllabusUploadModal] = useState(false);
  const [selectedClassForSyllabus, setSelectedClassForSyllabus] = useState(null);
  const [selectedSubjectForSyllabus, setSelectedSubjectForSyllabus] = useState(null);
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [uploadingSyllabus, setUploadingSyllabus] = useState(false);
  const [syllabusUploadResult, setSyllabusUploadResult] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all subjects
      const allSubjectsData = await apiFetch('/classes/list_subjects.php', { method: 'GET' });
      setAllSubjects(Array.isArray(allSubjectsData) ? allSubjectsData : []);

      // Load classes
      const classesData = await apiFetch('/classes/list_classes.php', { method: 'GET' });
      if (Array.isArray(classesData)) {
        setClasses(classesData);

        // Load subjects for each class
        const subjectsMap = {};
        const assignmentsMap = {};
        for (const cls of classesData) {
          const classSubjects = await apiFetch(`/classes/list_class_subjects.php?class_id=${cls.id}`, {
            method: 'GET',
          });
          subjectsMap[cls.id] = Array.isArray(classSubjects) ? classSubjects : [];

          // Load assignments for each class+subject
          for (const cs of (Array.isArray(classSubjects) ? classSubjects : [])) {
            const key = `${cls.id}_${cs.subject_id}`;
            assignmentsMap[key] = [];
          }
        }
        setSubjects(subjectsMap);
        setClassSubjectAssignments(assignmentsMap);
      }

      // Load all users
      const usersData = await apiFetch('/classes/list_all_users.php', { method: 'GET' });
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUsers = async () => {
    if (!selectedClass || !selectedSubject || selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select class, subject, and users');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let alreadyAssignedCount = 0;
    let failureCount = 0;

    try {
      const subject = (subjects[selectedClass] || []).find((s) => s.subject_id === selectedSubject);
      if (!subject) {
        Alert.alert('Error', 'Invalid subject');
        setLoading(false);
        return;
      }

      for (const userId of selectedUsers) {
        try {
          await apiFetch('/classes/create_user_class_subject.php', {
            method: 'POST',
            body: JSON.stringify({
              user_id: userId,
              class_subject_id: subject.class_subject_id,
            }),
          });
          successCount++;
        } catch (err) {
          // Handle 409 Conflict (already assigned)
          if (err.message && err.message.includes('already assigned')) {
            alreadyAssignedCount++;
          } else {
            failureCount++;
            console.error(`Failed to assign user ${userId}:`, err.message);
          }
        }
      }

      // Note: Make sure to upload syllabus for this class-subject so users can see it
      console.log('Reminder: Upload syllabus for class-subject ID:', subject.class_subject_id);

      // Show summary message
      let summary = `Assigned: ${successCount}`;
      if (alreadyAssignedCount > 0) summary += `, Already assigned: ${alreadyAssignedCount}`;
      if (failureCount > 0) summary += `, Failed: ${failureCount}`;

      Alert.alert('Assignment Summary', summary);
      setShowUserModal(false);
      setSelectedUsers([]);
      loadData();
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubjectToClass = async () => {
    if (!selectedClass || !selectedSubjectToAdd) {
      Alert.alert('Error', 'Please select a subject');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/classes/create_class_subject.php', {
        method: 'POST',
        body: JSON.stringify({
          class_id: selectedClass,
          subject_id: selectedSubjectToAdd,
        }),
      });

      Alert.alert('Success', 'Subject added to class');
      setShowAddSubjectModal(false);
      setSelectedClass(null);
      setSelectedSubjectToAdd(null);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubjectAndAddToClass = async () => {
    if (!selectedClass) {
      Alert.alert('Error', 'Please select a class first');
      return;
    }
    if (!newSubjectName.trim()) {
      Alert.alert('Error', 'Subject name is required');
      return;
    }

    setCreatingNewSubject(true);
    try {
      const result = await apiFetch('/classes/create_subject.php', {
        method: 'POST',
        body: JSON.stringify({
          name: newSubjectName.trim(),
          description: newSubjectDescription.trim() || null,
          has_activities: newSubjectHasActivities,
        }),
      });

      const subjectId = result.id;
      await apiFetch('/classes/create_class_subject.php', {
        method: 'POST',
        body: JSON.stringify({
          class_id: selectedClass,
          subject_id: subjectId,
        }),
      });

      Alert.alert('Success', 'New subject created and added to class');
      setNewSubjectName('');
      setNewSubjectDescription('');
      setNewSubjectHasActivities(false);
      setShowAddSubjectModal(false);
      setSelectedClass(null);
      setSelectedSubjectToAdd(null);
      loadData();
    } catch (err) {
      if (err.message && err.message.includes('Subject name already exists')) {
        const existing = allSubjects.find((sub) => sub.name.toLowerCase() === newSubjectName.trim().toLowerCase());
        if (existing) {
          try {
            await apiFetch('/classes/create_class_subject.php', {
              method: 'POST',
              body: JSON.stringify({
                class_id: selectedClass,
                subject_id: existing.id,
              }),
            });
            Alert.alert('Success', 'Existing subject added to class');
            setShowAddSubjectModal(false);
            setSelectedClass(null);
            setSelectedSubjectToAdd(null);
            loadData();
            return;
          } catch (innerErr) {
            Alert.alert('Error', innerErr.message);
            return;
          }
        }
      }
      Alert.alert('Error', err.message || 'Failed to create subject');
    } finally {
      setCreatingNewSubject(false);
    }
  };

  const pickSyllabusDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
          "application/vnd.ms-excel", // .xls
          "text/csv",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setSyllabusFile(file);
        Alert.alert(
          "File Selected",
          `${file.name} selected. Click "Upload" to proceed.`
        );
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick file: " + err.message);
    }
  };

  const handleUploadSyllabus = async () => {
    if (!syllabusFile) {
      Alert.alert("Error", "Please select a file first");
      return;
    }

    if (!selectedSubjectForSyllabus) {
      Alert.alert("Error", "No subject selected");
      return;
    }

    setUploadingSyllabus(true);
    try {
      // Get the class_subject_id from the selected subject
      const classSubjectData = (subjects[selectedClassForSyllabus] || []).find(
        (s) => s.subject_id === selectedSubjectForSyllabus
      );
      
      if (!classSubjectData) {
        Alert.alert("Error", "Invalid class-subject combination");
        setUploadingSyllabus(false);
        return;
      }

      let fileBlob;
      if (syllabusFile.uri.startsWith("file://")) {
        const response = await fetch(syllabusFile.uri);
        fileBlob = await response.blob();
      } else {
        const response = await fetch(syllabusFile.uri);
        fileBlob = await response.blob();
      }

      const formData = new FormData();
      formData.append("file", fileBlob, syllabusFile.name);
      formData.append("class_subject_id", classSubjectData.class_subject_id);

      const response = await apiFetch("/curriculum/upload_syllabus.php", {
        method: "POST",
        body: formData,
      });

      if (response.success) {
        setSyllabusUploadResult(response);
        Alert.alert(
          "Success",
          `${response.inserted_rows || 0} rows inserted, ${response.updated_rows || 0} rows updated`
        );
        setSyllabusFile(null);
      } else {
        Alert.alert("Error", response.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Error", err.message || "Upload failed");
    } finally {
      setUploadingSyllabus(false);
    }
  };

  const closeSyllabusModal = () => {
    setShowSyllabusUploadModal(false);
    setSelectedClassForSyllabus(null);
    setSelectedSubjectForSyllabus(null);
    setSyllabusFile(null);
    setSyllabusUploadResult(null);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      contentContainerStyle={{ padding: isMobile ? 0 : 16 }}
    >
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginHorizontal: isMobile ? 0 : 8, marginBottom: 12 }}>
        Assign Users to Classes & Subjects
      </Text>

      {/* Class Selector Dropdown */}
      <Surface
        style={{
          marginHorizontal: isMobile ? 0 : 8,
          marginBottom: 16,
          borderRadius: 8,
          backgroundColor: '#fff',
        }}
      >
        <Menu
          visible={showClassMenu}
          onDismiss={() => setShowClassMenu(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setShowClassMenu(true)}
              style={{
                margin: 12,
                justifyContent: 'center',
                height: 48,
              }}
            >
              {selectedClassForDisplay
                ? `Selected: ${classes.find((c) => c.id === selectedClassForDisplay)?.name || 'Unknown'}`
                : 'Select a Class'}
            </Button>
          }
        >
          {classes.length === 0 ? (
            <Menu.Item onPress={() => {}} title="No classes available" disabled />
          ) : (
            classes.map((cls) => (
              <Menu.Item
                key={cls.id}
                onPress={() => {
                  setSelectedClassForDisplay(cls.id);
                  setShowClassMenu(false);
                  setSelectedClass(null);
                  setSelectedSubject(null);
                }}
                title={cls.name}
              />
            ))
          )}
        </Menu>
      </Surface>

      {/* Selected Class Content */}
      {selectedClassForDisplay ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginHorizontal: isMobile ? 0 : 8, marginBottom: 12 }}>
            Subjects in {classes.find((c) => c.id === selectedClassForDisplay)?.name}
          </Text>
          
          {(subjects[selectedClassForDisplay] || []).length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#999', marginHorizontal: isMobile ? 0 : 8 }}>
              No subjects assigned to this class
            </Text>
          ) : (
            <Surface
              style={{
                padding: 12,
                marginHorizontal: isMobile ? 0 : 8,
                marginVertical: 8,
                borderRadius: 8,
                backgroundColor: '#fff',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                  {classes.find((c) => c.id === selectedClassForDisplay)?.name}
                </Text>
                <Button
                  mode="outlined"
                  compact
                  onPress={() => {
                    setSelectedClass(selectedClassForDisplay);
                    setShowAddSubjectModal(true);
                  }}
                >
                  + Add Subject
                </Button>
              </View>
              
              <FlatList
                data={subjects[selectedClassForDisplay] || []}
                renderItem={({ item: subject }) => (
                  <View
                    style={{
                      backgroundColor: '#f9f9f9',
                      padding: 8,
                      marginBottom: 6,
                      borderRadius: 4,
                      borderLeftWidth: 3,
                      borderLeftColor: '#2196F3',
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, flex: 1 }}>{subject.subject_name}</Text>
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => {
                          setSelectedClassForSyllabus(selectedClassForDisplay);
                          setSelectedSubjectForSyllabus(subject.subject_id);
                          setSyllabusFile(null);
                          setSyllabusUploadResult(null);
                          setShowSyllabusUploadModal(true);
                        }}
                        style={{ marginLeft: 8 }}
                      >
                        Upload Syllabus
                      </Button>
                      <Button
                        mode="contained"
                        compact
                        onPress={() => {
                          setSelectedClass(selectedClassForDisplay);
                          setSelectedSubject(subject.subject_id);
                          setShowUserModal(true);
                        }}
                        style={{ marginLeft: 8 }}
                      >
                        Assign Users
                      </Button>
                    </View>
                  </View>
                )}
                keyExtractor={(item) => item.class_subject_id.toString()}
                scrollEnabled={false}
              />
            </Surface>
          )}
        </>
      ) : (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#999', marginHorizontal: isMobile ? 0 : 8 }}>
          Please select a class to view and manage its subjects
        </Text>
      )}

      {/* User Assignment Modal */}
      <Modal
        visible={showUserModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <Surface
            style={{
              width: '100%',
              maxWidth: 500,
              padding: 16,
              borderRadius: 8,
              maxHeight: '80%',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Select Users to Assign</Text>

            <ScrollView style={{ maxHeight: 300, marginBottom: 12 }}>
              {users.map((user) => (
                <View key={user.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Checkbox
                    status={selectedUsers.includes(user.id) ? 'checked' : 'unchecked'}
                    onPress={() => {
                      setSelectedUsers((prev) =>
                        prev.includes(user.id)
                          ? prev.filter((id) => id !== user.id)
                          : [...prev, user.id]
                      );
                    }}
                  />
                  <Text style={{ marginLeft: 8, flex: 1 }}>
                    {user.email}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowUserModal(false);
                  setSelectedUsers([]);
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleAssignUsers}
                loading={loading}
                disabled={loading || selectedUsers.length === 0}
                style={{ flex: 1 }}
              >
                Assign
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* Add Subject to Class Modal */}
      <Modal
        visible={showAddSubjectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddSubjectModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <Surface
            style={{
              width: '100%',
              maxWidth: 500,
              padding: 16,
              borderRadius: 8,
              maxHeight: '80%',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Select or Create Subject for Class</Text>
            <Text style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
              Class ID: {selectedClass}
            </Text>

            <ScrollView style={{ maxHeight: 220, marginBottom: 12 }}>
              {allSubjects.map((subject) => (
                <View
                  key={subject.id}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    marginBottom: 8,
                    borderRadius: 4,
                    backgroundColor: selectedSubjectToAdd === subject.id ? '#E3F2FD' : '#f9f9f9',
                    borderLeftWidth: 3,
                    borderLeftColor: selectedSubjectToAdd === subject.id ? '#2196F3' : '#ddd',
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedSubjectToAdd(subject.id)}
                  >
                    <Text style={{ fontSize: 14 }}>{subject.name}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={{ borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 8 }}>Create New Subject</Text>
              <TextInput
                label="Subject Name"
                value={newSubjectName}
                onChangeText={setNewSubjectName}
                mode="outlined"
                style={{ marginBottom: 10 }}
              />
              <TextInput
                label="Description"
                value={newSubjectDescription}
                onChangeText={setNewSubjectDescription}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={{ marginBottom: 10 }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ marginRight: 12 }}>Has Activities</Text>
                <Switch
                  value={newSubjectHasActivities}
                  onValueChange={setNewSubjectHasActivities}
                />
              </View>
              <Button
                mode="contained"
                onPress={handleCreateSubjectAndAddToClass}
                loading={creatingNewSubject}
                disabled={creatingNewSubject || !newSubjectName.trim()}
                style={{ marginBottom: 12 }}
              >
                Create and Add
              </Button>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowAddSubjectModal(false);
                  setSelectedClass(null);
                  setSelectedSubjectToAdd(null);
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleAddSubjectToClass}
                loading={loading}
                disabled={loading || !selectedSubjectToAdd}
                style={{ flex: 1 }}
              >
                Add
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* Syllabus Upload Modal */}
      <Modal
        visible={showSyllabusUploadModal}
        transparent
        animationType="fade"
        onRequestClose={closeSyllabusModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <Surface
            style={{
              width: '100%',
              maxWidth: 500,
              padding: 16,
              borderRadius: 8,
              maxHeight: '90%',
            }}
          >
            <ScrollView>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Upload Syllabus</Text>
              {selectedSubjectForSyllabus && (
                <Text style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
                  {(subjects[selectedClassForSyllabus] || []).find((s) => s.subject_id === selectedSubjectForSyllabus)?.subject_name}
                </Text>
              )}

              {/* File Selection */}
              <Button
                mode="outlined"
                icon="file-document"
                onPress={pickSyllabusDocument}
                style={{ marginBottom: 12 }}
              >
                {syllabusFile ? `${syllabusFile.name} ✓` : "Select File (.xlsx, .xls, .csv)"}
              </Button>

              {/* Upload Results */}
              {syllabusUploadResult && (
                <Surface
                  style={{
                    padding: 12,
                    marginBottom: 12,
                    backgroundColor: '#E8F5E9',
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontWeight: 'bold', color: '#2E7D32', marginBottom: 8 }}>
                    Upload Successful!
                  </Text>
                  <Text style={{ fontSize: 12, color: '#1B5E20' }}>
                    • Inserted Rows: {syllabusUploadResult.inserted_rows || 0}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#1B5E20' }}>
                    • Updated Rows: {syllabusUploadResult.updated_rows || 0}
                  </Text>
                </Surface>
              )}

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
                <Button
                  mode="outlined"
                  onPress={closeSyllabusModal}
                  style={{ flex: 1 }}
                >
                  Close
                </Button>
                {!syllabusUploadResult && (
                  <Button
                    mode="contained"
                    onPress={handleUploadSyllabus}
                    loading={uploadingSyllabus}
                    disabled={uploadingSyllabus || !syllabusFile}
                    style={{ flex: 1 }}
                  >
                    Upload
                  </Button>
                )}
              </View>
            </ScrollView>
          </Surface>
        </View>
      </Modal>
    </ScrollView>
  );
}
