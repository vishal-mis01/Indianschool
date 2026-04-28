import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, useWindowDimensions, FlatList, TextInput as RNTextInput } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Switch,
  Surface,
  Divider,
  Menu,
  Modal,
  Portal,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import apiFetch from "./apiFetch";
import { ADMIN_BUTTON_MAX_WIDTH } from "./adminConfig";

export default function AdminFormBuilder() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  /* ===== STATE ===== */
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [selectedProcessId, setSelectedProcessId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [users, setUsers] = useState([]);
  
  // Section state
  const [sections, setSections] = useState([]);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  
  // Field state
  const [newFieldInSection, setNewFieldInSection] = useState(null);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [isRequired, setIsRequired] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [newOption, setNewOption] = useState("");
  
  // UI state
  const [formMenuVisible, setFormMenuVisible] = useState(false);
  const [processMenuVisible, setProcessMenuVisible] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [fieldTypeMenuVisible, setFieldTypeMenuVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownSearchVisible, setDropdownSearchVisible] = useState(false);
  
  const FIELD_TYPES = ["text", "number", "date", "textarea", "file", "camera", "dropdown", "multiple_choice"];

  /* ===== INITIAL LOAD ===== */
  useEffect(() => {
    loadForms();
    loadProcesses();
    loadUsers();
  }, []);

  /* ===== LOADERS ===== */
  const loadForms = async () => {
    const res = await apiFetch("/forms/list_forms.php");
    setForms(Array.isArray(res) ? res : []);
  };

  const loadProcesses = async () => {
    const res = await apiFetch("/fms/list_processes.php");
    setProcesses(Array.isArray(res) ? res : []);
  };

  const loadUsers = async () => {
    const res = await apiFetch("/admin_get_users.php");
    setUsers(Array.isArray(res) ? res : []);
  };

  /* ===== CREATE FORM ===== */
  const createForm = async () => {
    if (!formName.trim()) {
      alert("Form name is required");
      return;
    }

    try {
      await apiFetch("/forms/create_form.php", {
        method: "POST",
        body: {
          name: formName.trim(),
          description: formDescription.trim(),
          process_id: selectedProcessId,
        },
      });

      setFormName("");
      setFormDescription("");
      setSelectedProcessId(null);
      setSections([
        { id: 1, title: "Section 1", fields: [] }
      ]);
      loadForms();
      alert("Form created successfully!");
    } catch (err) {
      alert("Error creating form: " + err.message);
    }
  };

  /* ===== SECTION HANDLERS ===== */
  const addSection = () => {
    const newId = Math.max(...sections.map(s => s.id), 0) + 1;
    setSections([...sections, { id: newId, title: `Section ${newId}`, fields: [] }]);
  };

  const updateSectionTitle = (sectionId) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, title: editingSectionTitle } : s
    ));
    setEditingSectionId(null);
    setEditingSectionTitle("");
  };

  const deleteSection = (sectionId) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  /* ===== FIELD HANDLERS ===== */
  const addFieldToSection = (sectionId) => {
    if (!fieldLabel.trim()) {
      alert("Field label required");
      return;
    }

    const updatedSections = sections.map(section => {
      if (section.id === sectionId) {
        const newField = {
          id: Math.random(),
          label: fieldLabel.trim(),
          type: fieldType,
          required: isRequired,
          options: fieldType === "dropdown" || fieldType === "multiple_choice" ? dropdownOptions : [],
        };
        return { ...section, fields: [...section.fields, newField] };
      }
      return section;
    });

    setSections(updatedSections);
    setFieldLabel("");
    setFieldType("text");
    setIsRequired(false);
    setDropdownOptions([]);
    setNewOption("");
    setNewFieldInSection(null);
  };

  const deleteField = (sectionId, fieldId) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          fields: section.fields.filter(f => f.id !== fieldId)
        };
      }
      return section;
    }));
  };

  const addDropdownOption = () => {
    if (!newOption.trim()) return;
    setDropdownOptions([...dropdownOptions, newOption.trim()]);
    setNewOption("");
  };

  const removeDropdownOption = (index) => {
    setDropdownOptions(dropdownOptions.filter((_, i) => i !== index));
  };

  /* ===== SAVE FORM ===== */
  const saveFormStructure = async () => {
    if (!selectedForm) {
      alert("Select a form first");
      return;
    }

    try {
      for (const section of sections) {
        for (const field of section.fields) {
          await apiFetch("/forms/create_form_field.php", {
            method: "POST",
            body: {
              form_id: selectedForm.id,
              label: field.label,
              field_type: field.type,
              is_required: field.required ? 1 : 0,
              options_json: (field.type === "dropdown" || field.type === "multiple_choice") 
                ? JSON.stringify(field.options) 
                : null,
            },
          });
        }
      }
      alert("Form structure saved successfully!");
      loadForms();
    } catch (err) {
      alert("Error saving form: " + err.message);
    }
  };

  /* ===== ASSIGN FORM ===== */
  const assignFormToUser = async () => {
    if (!selectedForm || !selectedUserId) {
      alert("Select form and user");
      return;
    }

    try {
      await apiFetch("/forms/assign_form_to_user.php", {
        method: "POST",
        body: {
          form_id: selectedForm.id,
          user_id: selectedUserId,
        },
      });

      alert("Form assigned successfully");
      setSelectedUserId(null);
    } catch (err) {
      alert("Error assigning form: " + err.message);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || u.email).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollView style={styles.container}>
      {/* CREATE FORM CARD */}
      <Surface style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="add-circle" size={24} color="#2563EB" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Create New Form</Text>
            <Text style={styles.cardSubtitle}>Start building your form</Text>
          </View>
        </View>

        <Divider />

        <View style={styles.cardContent}>
          <TextInput
            label="Form Name *"
            value={formName}
            onChangeText={setFormName}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., Employee Feedback"
          />

          <TextInput
            label="Description (optional)"
            value={formDescription}
            onChangeText={setFormDescription}
            mode="outlined"
            style={styles.input}
            placeholder="What is this form for?"
            multiline
            numberOfLines={2}
          />

          <Text style={styles.sectionLabel}>Link to FMS Process (Optional)</Text>
          <Menu
            visible={processMenuVisible}
            onDismiss={() => setProcessMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setProcessMenuVisible(true)}
                style={styles.fullWidthButton}
              >
                {selectedProcessId
                  ? processes.find((p) => p.id === selectedProcessId)?.name
                  : "Select Process"}
              </Button>
            }
          >
            <Menu.Item
              title="No Process"
              onPress={() => {
                setSelectedProcessId(null);
                setProcessMenuVisible(false);
              }}
            />
            {processes.map((p) => (
              <Menu.Item
                key={p.id}
                title={p.name}
                onPress={() => {
                  setSelectedProcessId(p.id);
                  setProcessMenuVisible(false);
                }}
              />
            ))}
          </Menu>

          <Button mode="contained" onPress={createForm} style={styles.button}>
            Create Form
          </Button>
        </View>
      </Surface>

      {/* SELECT FORM CARD */}
      <Surface style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="document" size={24} color="#2563EB" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Select Form</Text>
            <Text style={styles.cardSubtitle}>{forms.length} forms available</Text>
          </View>
        </View>

        <Divider />

        <View style={styles.cardContent}>
          <Menu
            visible={formMenuVisible}
            onDismiss={() => setFormMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setFormMenuVisible(true)}
                style={styles.fullWidthButton}
              >
                {selectedForm ? selectedForm.name : "Select a form..."}
              </Button>
            }
          >
            {forms.map((f) => (
              <Menu.Item
                key={f.id}
                title={f.name}
                onPress={() => {
                  setSelectedForm(f);
                  setSections([{ id: 1, title: "Section 1", fields: [] }]);
                  setFormMenuVisible(false);
                }}
              />
            ))}
          </Menu>
        </View>
      </Surface>

      {/* FORM BUILDER CARD - GOOGLE FORMS STYLE */}
      {selectedForm && (
        <>
          <Surface style={styles.formBuilderCard}>
            <View style={styles.formBuilderHeader}>
              <Text style={styles.formTitle}>{selectedForm.name}</Text>
              <Text style={styles.formDesc}>{selectedForm.description}</Text>
            </View>

            <View style={styles.sectionsContainer}>
              {sections.map((section, sectionIdx) => (
                <View key={section.id} style={styles.sectionBlock}>
                  {/* SECTION HEADER */}
                  <View style={styles.sectionHeader}>
                    {editingSectionId === section.id ? (
                      <View style={styles.editSectionRow}>
                        <TextInput
                          style={styles.sectionInput}
                          value={editingSectionTitle}
                          onChangeText={setEditingSectionTitle}
                          mode="flat"
                          placeholder="Section title"
                        />
                        <Button
                          mode="text"
                          onPress={() => updateSectionTitle(section.id)}
                          compact
                        >
                          Save
                        </Button>
                        <Button
                          mode="text"
                          onPress={() => setEditingSectionId(null)}
                          compact
                        >
                          Cancel
                        </Button>
                      </View>
                    ) : (
                      <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <View style={styles.sectionActions}>
                          <Button
                            icon="pencil"
                            mode="text"
                            compact
                            onPress={() => {
                              setEditingSectionId(section.id);
                              setEditingSectionTitle(section.title);
                            }}
                          />
                          <Button
                            icon="delete"
                            mode="text"
                            compact
                            onPress={() => deleteSection(section.id)}
                          />
                        </View>
                      </View>
                    )}
                  </View>

                  {/* FIELDS IN SECTION */}
                  <View style={styles.fieldsInSection}>
                    {section.fields.map((field, fieldIdx) => (
                      <View key={field.id} style={styles.fieldPreview}>
                        <View style={styles.fieldPreviewHeader}>
                          <Text style={styles.fieldPreviewLabel}>
                            {field.label} {field.required && <Text style={styles.required}>*</Text>}
                          </Text>
                          <Button
                            icon="delete"
                            mode="text"
                            compact
                            onPress={() => deleteField(section.id, field.id)}
                          />
                        </View>
                        <Text style={styles.fieldPreviewType}>{field.type}</Text>
                        {field.options.length > 0 && (
                          <View style={styles.optionsPreview}>
                            {field.options.map((opt, idx) => (
                              <Text key={idx} style={styles.optionItem}>○ {opt}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* ADD FIELD TO SECTION */}
                  {newFieldInSection === section.id ? (
                    <View style={styles.addFieldForm}>
                      <TextInput
                        label="Field Label *"
                        value={fieldLabel}
                        onChangeText={setFieldLabel}
                        mode="outlined"
                        style={styles.input}
                        placeholder="e.g., Email Address"
                      />

                      <Menu
                        visible={fieldTypeMenuVisible}
                        onDismiss={() => setFieldTypeMenuVisible(false)}
                        anchor={
                          <Button
                            mode="outlined"
                            onPress={() => setFieldTypeMenuVisible(true)}
                            style={styles.fullWidthButton}
                          >
                            Type: {fieldType}
                          </Button>
                        }
                      >
                        {FIELD_TYPES.map((type) => (
                          <Menu.Item
                            key={type}
                            title={type}
                            onPress={() => {
                              setFieldType(type);
                              setFieldTypeMenuVisible(false);
                            }}
                          />
                        ))}
                      </Menu>

                      {(fieldType === "dropdown" || fieldType === "multiple_choice") && (
                        <View style={styles.optionsSection}>
                          <Text style={styles.sectionLabel}>Options</Text>
                          {dropdownOptions.map((opt, idx) => (
                            <View key={idx} style={styles.optionRow}>
                              <Text style={styles.optionText}>{opt}</Text>
                              <Button
                                icon="close"
                                mode="text"
                                compact
                                onPress={() => removeDropdownOption(idx)}
                              />
                            </View>
                          ))}

                          <View style={styles.addOptionRow}>
                            <TextInput
                              value={newOption}
                              onChangeText={setNewOption}
                              placeholder="Add option"
                              mode="outlined"
                              style={styles.optionInput}
                            />
                            <Button
                              mode="contained"
                              onPress={addDropdownOption}
                              compact
                            >
                              Add
                            </Button>
                          </View>
                        </View>
                      )}

                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Required</Text>
                        <Switch value={isRequired} onValueChange={setIsRequired} />
                      </View>

                      <View style={styles.formActions}>
                        <Button
                          mode="contained"
                          onPress={() => addFieldToSection(section.id)}
                          style={styles.flex1}
                        >
                          Add Field
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={() => {
                            setNewFieldInSection(null);
                            setFieldLabel("");
                            setFieldType("text");
                            setIsRequired(false);
                            setDropdownOptions([]);
                          }}
                          style={[styles.flex1, { marginLeft: 8 }]}
                        >
                          Cancel
                        </Button>
                      </View>
                    </View>
                  ) : (
                    <Button
                      mode="outlined"
                      onPress={() => setNewFieldInSection(section.id)}
                      icon="plus"
                      style={styles.addFieldButton}
                    >
                      Add Question
                    </Button>
                  )}
                </View>
              ))}
            </View>

            {/* ADD SECTION BUTTON */}
            <View style={styles.addSectionContainer}>
              <Button
                mode="outlined"
                onPress={addSection}
                icon="plus"
                style={styles.fullWidthButton}
              >
                Add Section
              </Button>
            </View>

            {/* SAVE FORM */}
            <View style={styles.saveFormContainer}>
              <Button
                mode="contained"
                onPress={saveFormStructure}
                style={styles.fullWidthButton}
              >
                Save Form Structure
              </Button>
            </View>
          </Surface>

          {/* ASSIGN FORM CARD */}
          <Surface style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-add" size={24} color="#2563EB" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>Assign Form to Users</Text>
              </View>
            </View>

            <Divider />

            <View style={styles.cardContent}>
              <Menu
                visible={userMenuVisible}
                onDismiss={() => setUserMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setUserMenuVisible(true)}
                    style={styles.fullWidthButton}
                  >
                    {selectedUserId
                      ? users.find((u) => u.id === selectedUserId)?.name ||
                        users.find((u) => u.id === selectedUserId)?.email
                      : "Select a user..."}
                  </Button>
                }
              >
                <RNTextInput
                  style={styles.menuSearchInput}
                  placeholder="Search users..."
                  onChangeText={setSearchQuery}
                  value={searchQuery}
                />
                {filteredUsers.map((u) => (
                  <Menu.Item
                    key={u.id}
                    title={u.name || u.email}
                    onPress={() => {
                      setSelectedUserId(u.id);
                      setSearchQuery("");
                      setUserMenuVisible(false);
                    }}
                  />
                ))}
              </Menu>

              <Button
                mode="contained"
                onPress={assignFormToUser}
                disabled={!selectedUserId}
                style={styles.button}
              >
                Assign Form
              </Button>
            </View>
          </Surface>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 0,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginHorizontal: 0,
    marginBottom: 8,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  cardContent: {
    padding: 16,
  },
  
  /* FORM BUILDER STYLES */
  formBuilderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 0,
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
  },
  formBuilderHeader: {
    padding: 24,
    backgroundColor: "#F0F4F8",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  formDesc: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },

  sectionsContainer: {
    padding: 16,
    gap: 20,
  },
  sectionBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  sectionActions: {
    flexDirection: "row",
  },
  editSectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  fieldsInSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  fieldPreview: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#2563EB",
  },
  fieldPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  fieldPreviewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  required: {
    color: "#EF4444",
    fontWeight: "700",
  },
  fieldPreviewType: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  optionsPreview: {
    marginTop: 8,
    paddingLeft: 12,
    gap: 4,
  },
  optionItem: {
    fontSize: 11,
    color: "#64748B",
  },

  addFieldForm: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#456d5c",
  },
  optionsSection: {
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    marginBottom: 6,
  },
  optionText: {
    fontSize: 12,
    color: "#1E293B",
    flex: 1,
  },
  addOptionRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  optionInput: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  addFieldButton: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  addSectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  saveFormContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#F0F4F8",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  input: {
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    maxWidth: 500,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  fullWidthButton: {
    width: 500,
    maxWidth: "100%",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    marginVertical: 12,
  },
  switchLabel: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
  },
  formActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  flex1: {
    flex: 1,
  },
  menuSearchInput: {
    margin: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "System",
  },
});
