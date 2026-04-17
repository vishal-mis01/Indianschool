import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Switch,
  Surface,
  Divider,
  Menu,
  Card,
  Chip,
  IconButton,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import apiFetch from "./apiFetch";
import * as FormService from "./fmsFormService";

export default function EnhancedFormBuilder() {
  /* ===== STATE ===== */
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [editingField, setEditingField] = useState(null);

  // Form settings
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [themeColor, setThemeColor] = useState("#3C3C3C");
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [formStatus, setFormStatus] = useState("draft");
  const [allowResponseEditing, setAllowResponseEditing] = useState(false);

  // Field settings
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [fieldDescription, setFieldDescription] = useState("");
  const [helpText, setHelpText] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState([]);

  const [fieldTypeMenuVisible, setFieldTypeMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [formMenuVisible, setFormMenuVisible] = useState(false);

  const FIELD_TYPES = [
    { label: "Short Text", value: "text", icon: "text" },
    { label: "Long Text", value: "textarea", icon: "text-box" },
    { label: "Number", value: "number", icon: "numeric" },
    { label: "Date", value: "date", icon: "calendar" },
    { label: "Multiple Choice", value: "select", icon: "radio-box-outline" },
    { label: "Dropdown", value: "dropdown", icon: "menu-down" },
    { label: "File Upload", value: "file", icon: "file-upload" },
  ];

  /* ===== INITIAL LOAD ===== */
  useEffect(() => {
    loadForms();
  }, []);

  /* ===== LOADERS ===== */
  const loadForms = async () => {
    try {
      const res = await apiFetch("/forms/list_forms.php");
      setForms(Array.isArray(res) ? res : []);
    } catch (err) {
      Alert.alert("Error", "Failed to load forms");
    }
  };

  const loadFormDetails = async (formId) => {
    try {
      const res = await FormService.getFormDetails(formId);
      if (res.success) {
        const form = res.form;
        setFormName(form.name || "");
        setFormDescription(form.description || "");
        setThemeColor(form.theme_color || "#3C3C3C");
        setShowProgressBar(form.show_progress_bar || true);
        setShuffleQuestions(form.shuffle_questions || false);
        setFormStatus(form.form_status || "draft");
        setAllowResponseEditing(form.allow_response_editing || false);
        setFields(res.fields || []);
        setSelectedForm(form);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load form details");
    }
  };

  /* ===== CREATE FORM ===== */
  const createForm = async () => {
    if (!formName.trim()) {
      Alert.alert("Error", "Form name is required");
      return;
    }

    try {
      const res = await FormService.createForm({
        name: formName.trim(),
        description: formDescription.trim(),
        theme_color: themeColor,
        show_progress_bar: showProgressBar,
        shuffle_questions: shuffleQuestions,
        form_status: formStatus,
        allow_response_editing: allowResponseEditing,
      });

      if (res.success) {
        resetFormFields();
        loadForms();
        Alert.alert("Success", "Form created successfully!");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to create form: " + err.message);
    }
  };

  /* ===== UPDATE FORM ===== */
  const updateForm = async () => {
    if (!selectedForm) return;

    try {
      await FormService.updateForm(selectedForm.id, {
        name: formName.trim(),
        description: formDescription.trim(),
        theme_color: themeColor,
        show_progress_bar: showProgressBar,
        shuffle_questions: shuffleQuestions,
        form_status: formStatus,
        allow_response_editing: allowResponseEditing,
      });

      loadForms();
      Alert.alert("Success", "Form updated successfully!");
    } catch (err) {
      Alert.alert("Error", "Failed to update form: " + err.message);
    }
  };

  /* ===== ADD/UPDATE FIELD ===== */
  const saveField = async () => {
    if (!selectedForm || !fieldLabel.trim()) {
      Alert.alert("Error", "Field label is required");
      return;
    }

    try {
      const payload = {
        form_id: selectedForm.id,
        label: fieldLabel.trim(),
        field_type: fieldType,
        is_required: isRequired ? 1 : 0,
        description: fieldDescription.trim() || null,
        help_text: helpText.trim() || null,
        placeholder: placeholder.trim() || null,
        options_json: fieldOptions.length > 0 ? JSON.stringify(fieldOptions) : null,
      };

      if (editingField) {
        await FormService.updateFormField(editingField.id, payload);
        Alert.alert("Success", "Field updated!");
      } else {
        await FormService.createFormField(payload);
        Alert.alert("Success", "Field added!");
      }

      resetFieldForm();
      loadFormDetails(selectedForm.id);
    } catch (err) {
      Alert.alert("Error", "Failed to save field: " + err.message);
    }
  };

  /* ===== DELETE FIELD ===== */
  const deleteField = async (fieldId) => {
    Alert.alert("Delete Field", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await apiFetch(`/forms/delete_form_field.php?field_id=${fieldId}`, {
              method: "POST",
            });
            loadFormDetails(selectedForm.id);
            Alert.alert("Success", "Field deleted");
          } catch (err) {
            Alert.alert("Error", "Failed to delete field");
          }
        },
      },
    ]);
  };

  /* ===== RESET FUNCTIONS ===== */
  const resetFormFields = () => {
    setFormName("");
    setFormDescription("");
    setThemeColor("#3C3C3C");
    setShowProgressBar(true);
    setShuffleQuestions(false);
    setFormStatus("draft");
    setAllowResponseEditing(false);
  };

  const resetFieldForm = () => {
    setFieldLabel("");
    setFieldType("text");
    setFieldDescription("");
    setHelpText("");
    setPlaceholder("");
    setIsRequired(false);
    setFieldOptions([]);
    setEditingField(null);
  };

  const editField = (field) => {
    setEditingField(field);
    setFieldLabel(field.label || "");
    setFieldType(field.field_type || "text");
    setFieldDescription(field.description || "");
    setHelpText(field.help_text || "");
    setPlaceholder(field.placeholder || "");
    setIsRequired(field.is_required || false);
    setFieldOptions(field.options || []);
  };

  /* ===== RENDER ===== */
  return (
    <ScrollView style={styles.container}>
      {/* FORM SELECTION */}
      {!selectedForm && (
        <Surface style={styles.card}>
          <Text style={styles.title}>Select or Create Form</Text>
          <Button
            mode="contained"
            onPress={() => setSelectedForm({ id: null })}
            style={styles.button}
          >
            + Create New Form
          </Button>

          <Divider style={styles.divider} />

          {forms.length > 0 && (
            <>
              <Text style={styles.subtitle}>Existing Forms</Text>
              {forms.map((form) => (
                <Card
                  key={form.id}
                  style={styles.formCard}
                  onPress={() => {
                    setSelectedForm(form);
                    loadFormDetails(form.id);
                  }}
                >
                  <Card.Content>
                    <Text style={styles.formName}>{form.name}</Text>
                    <Text style={styles.formDesc}>{form.description}</Text>
                    <View style={styles.formMeta}>
                      <Chip>{form.form_status || "draft"}</Chip>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </>
          )}
        </Surface>
      )}

      {/* FORM EDITOR */}
      {selectedForm && (
        <>
          {/* Form Settings */}
          <Surface style={styles.card}>
            <Text style={styles.title}>Form Settings</Text>

            <TextInput
              label="Form Name"
              value={formName}
              onChangeText={setFormName}
              style={styles.input}
            />

            <TextInput
              label="Description"
              value={formDescription}
              onChangeText={setFormDescription}
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            {/* Theme Color */}
            <Text style={styles.label}>Theme Color</Text>
            <View style={styles.colorPicker}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  backgroundColor: themeColor,
                  borderRadius: 8,
                }}
              />
              <TextInput
                value={themeColor}
                onChangeText={setThemeColor}
                style={{ flex: 1, marginLeft: 10 }}
                placeholder="#3C3C3C"
              />
            </View>

            {/* Settings Toggles */}
            <View style={styles.toggleRow}>
              <Text>Show Progress Bar</Text>
              <Switch
                value={showProgressBar}
                onValueChange={setShowProgressBar}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text>Shuffle Questions</Text>
              <Switch
                value={shuffleQuestions}
                onValueChange={setShuffleQuestions}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text>Allow Response Editing</Text>
              <Switch
                value={allowResponseEditing}
                onValueChange={setAllowResponseEditing}
              />
            </View>

            {/* Form Status */}
            <Menu
              visible={statusMenuVisible}
              onDismiss={() => setStatusMenuVisible(false)}
              anchor={
                <Button
                  onPress={() => setStatusMenuVisible(true)}
                  style={styles.button}
                >
                  Status: {formStatus}
                </Button>
              }
            >
              <Menu.Item
                onPress={() => {
                  setFormStatus("draft");
                  setStatusMenuVisible(false);
                }}
                title="Draft"
              />
              <Menu.Item
                onPress={() => {
                  setFormStatus("published");
                  setStatusMenuVisible(false);
                }}
                title="Published"
              />
              <Menu.Item
                onPress={() => {
                  setFormStatus("closed");
                  setStatusMenuVisible(false);
                }}
                title="Closed"
              />
            </Menu>

            <Button
              mode="contained"
              onPress={selectedForm.id ? updateForm : createForm}
              style={styles.button}
            >
              {selectedForm.id ? "Update Form" : "Create Form"}
            </Button>

            <Button
              mode="outlined"
              onPress={() => {
                setSelectedForm(null);
                resetFormFields();
              }}
              style={styles.button}
            >
              Back
            </Button>
          </Surface>

          {/* Fields Section */}
          {selectedForm.id && (
            <Surface style={styles.card}>
              <Text style={styles.title}>Questions</Text>

              {/* Add/Edit Field */}
              <Surface style={styles.fieldForm}>
                <Text style={styles.subtitle}>
                  {editingField ? "Edit Question" : "Add Question"}
                </Text>

                <TextInput
                  label="Question"
                  value={fieldLabel}
                  onChangeText={setFieldLabel}
                  style={styles.input}
                />

                <TextInput
                  label="Description (optional)"
                  value={fieldDescription}
                  onChangeText={setFieldDescription}
                  style={styles.input}
                />

                <TextInput
                  label="Help Text (optional)"
                  value={helpText}
                  onChangeText={setHelpText}
                  style={styles.input}
                />

                <TextInput
                  label="Placeholder (optional)"
                  value={placeholder}
                  onChangeText={setPlaceholder}
                  style={styles.input}
                />

                {/* Field Type */}
                <Menu
                  visible={fieldTypeMenuVisible}
                  onDismiss={() => setFieldTypeMenuVisible(false)}
                  anchor={
                    <Button
                      onPress={() => setFieldTypeMenuVisible(true)}
                      style={styles.button}
                    >
                      Type: {FIELD_TYPES.find((t) => t.value === fieldType)?.label}
                    </Button>
                  }
                >
                  {FIELD_TYPES.map((type) => (
                    <Menu.Item
                      key={type.value}
                      onPress={() => {
                        setFieldType(type.value);
                        setFieldTypeMenuVisible(false);
                      }}
                      title={type.label}
                    />
                  ))}
                </Menu>

                {/* Required Toggle */}
                <View style={styles.toggleRow}>
                  <Text>Required</Text>
                  <Switch value={isRequired} onValueChange={setIsRequired} />
                </View>

                {/* Options for select/radio */}
                {["select", "dropdown"].includes(fieldType) && (
                  <View style={styles.optionsSection}>
                    <Text style={styles.label}>Options</Text>
                    {fieldOptions.map((option, idx) => (
                      <View key={idx} style={styles.optionRow}>
                        <TextInput
                          value={option}
                          onChangeText={(text) => {
                            const newOptions = [...fieldOptions];
                            newOptions[idx] = text;
                            setFieldOptions(newOptions);
                          }}
                          placeholder="Option"
                          style={{ flex: 1 }}
                        />
                        <IconButton
                          icon="delete"
                          size={20}
                          onPress={() => {
                            setFieldOptions(
                              fieldOptions.filter((_, i) => i !== idx)
                            );
                          }}
                        />
                      </View>
                    ))}
                    <Button
                      onPress={() => setFieldOptions([...fieldOptions, ""])}
                      style={styles.button}
                    >
                      + Add Option
                    </Button>
                  </View>
                )}

                <Button
                  mode="contained"
                  onPress={saveField}
                  style={styles.button}
                >
                  {editingField ? "Update Question" : "Add Question"}
                </Button>

                {editingField && (
                  <Button
                    mode="outlined"
                    onPress={resetFieldForm}
                    style={styles.button}
                  >
                    Cancel Edit
                  </Button>
                )}
              </Surface>

              {/* Fields List */}
              {fields.length > 0 && (
                <>
                  <Divider style={styles.divider} />
                  {fields.map((field, idx) => (
                    <Card key={field.id} style={styles.fieldCard}>
                      <Card.Content>
                        <View style={styles.fieldHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldNumber}>
                              Question {idx + 1}
                            </Text>
                            <Text style={styles.fieldTitle}>{field.label}</Text>
                            {field.description && (
                              <Text style={styles.fieldDesc}>
                                {field.description}
                              </Text>
                            )}
                            <View style={styles.fieldMeta}>
                              <Chip size="small">{field.field_type}</Chip>
                              {field.is_required && (
                                <Chip size="small" style={{ marginLeft: 5 }}>
                                  Required
                                </Chip>
                              )}
                            </View>
                          </View>
                          <View style={styles.fieldActions}>
                            <IconButton
                              icon="pencil"
                              onPress={() => editField(field)}
                            />
                            <IconButton
                              icon="delete"
                              onPress={() => deleteField(field.id)}
                            />
                          </View>
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
                </>
              )}
            </Surface>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#f5f5f5",
  },
  card: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    marginTop: 10,
  },
  input: {
    marginBottom: 10,
    maxWidth: '100%',
  },
  button: {
    marginTop: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 5,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  colorPicker: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  divider: {
    marginVertical: 15,
  },
  formCard: {
    marginBottom: 10,
    padding: 10,
  },
  formName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  formDesc: {
    fontSize: 12,
    color: "#666",
    marginVertical: 5,
  },
  formMeta: {
    flexDirection: "row",
    marginTop: 8,
  },
  fieldForm: {
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fafafa",
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  fieldCard: {
    marginBottom: 10,
  },
  fieldHeader: {
    flexDirection: "row",
  },
  fieldNumber: {
    fontSize: 11,
    color: "#999",
  },
  fieldTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginVertical: 3,
  },
  fieldDesc: {
    fontSize: 12,
    color: "#666",
    marginVertical: 3,
  },
  fieldMeta: {
    flexDirection: "row",
    marginTop: 8,
  },
  fieldActions: {
    flexDirection: "row",
  },
  optionsSection: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
});
