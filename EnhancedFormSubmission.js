import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Card,
  ProgressBar,
  RadioButton,
  Checkbox,
  Surface,
} from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import apiFetch from "./apiFetch";
import * as FormService from "./fmsFormService";

export default function EnhancedFormSubmission({ formId, onComplete }) {
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  /* LOAD FORM */
  useEffect(() => {
    if (!formId) return;

    FormService.getFormDetails(formId)
      .then((res) => {
        if (res.success) {
          setForm(res.form);
          setFields(res.fields || []);
          initializeValues(res.fields);
        }
      })
      .catch((err) => {
        Alert.alert("Error", "Failed to load form");
      });
  }, [formId]);

  const initializeValues = (fields) => {
    const initial = {};
    fields.forEach((field) => {
      initial[field.id] = "";
    });
    setValues(initial);
  };

  /* VALIDATION */
  const validateField = (field, value) => {
    const newErrors = { ...errors };

    // Check required
    if (field.is_required && !value) {
      newErrors[field.id] = "This field is required";
      setErrors(newErrors);
      return false;
    }

    // Check validation rules
    if (field.validation && value) {
      const rules = field.validation;

      if (rules.minLength && value.length < rules.minLength) {
        newErrors[field.id] = `Minimum ${rules.minLength} characters`;
        setErrors(newErrors);
        return false;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        newErrors[field.id] = `Maximum ${rules.maxLength} characters`;
        setErrors(newErrors);
        return false;
      }

      if (rules.pattern) {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
          newErrors[field.id] = "Invalid format";
          setErrors(newErrors);
          return false;
        }
      }

      if (rules.min && parseFloat(value) < rules.min) {
        newErrors[field.id] = `Minimum value is ${rules.min}`;
        setErrors(newErrors);
        return false;
      }

      if (rules.max && parseFloat(value) > rules.max) {
        newErrors[field.id] = `Maximum value is ${rules.max}`;
        setErrors(newErrors);
        return false;
      }
    }

    delete newErrors[field.id];
    setErrors(newErrors);
    return true;
  };

  const validateAll = () => {
    const newErrors = {};
    let isValid = true;

    fields.forEach((field) => {
      if (field.is_required && !values[field.id]) {
        newErrors[field.id] = "This field is required";
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  /* HANDLE VALUE CHANGE */
  const handleChange = (fieldId, value) => {
    setValues({ ...values, [fieldId]: value });
    const field = fields.find((f) => f.id === fieldId);
    validateField(field, value);
  };

  /* PICK FILE */
  const pickFile = async (fieldId) => {
    const res = await DocumentPicker.getDocumentAsync({});
    if (!res.canceled && res.assets[0]) {
      setValues({
        ...values,
        [fieldId]: res.assets[0],
      });
    }
  };

  /* SUBMIT FORM */
  const submitForm = async () => {
    if (!validateAll()) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      // Build form data
      const fd = new FormData();
      fd.append("form_id", formId);

      Object.entries(values).forEach(([fieldId, value]) => {
        if (value && value.uri) {
          // File
          fd.append(`files[${fieldId}]`, {
            uri: value.uri,
            name: value.name,
            type: value.mimeType || "application/octet-stream",
          });
        } else if (value) {
          // Regular value
          fd.append(`values[${fieldId}]`, value);
        }
      });

      const res = await apiFetch("/forms/submit_form.php", {
        method: "POST",
        body: fd,
      });

      if (res.success) {
        Alert.alert("Success", "Form submitted successfully!");
        if (onComplete) onComplete();
      }
    } catch (err) {
      Alert.alert("Error", "Failed to submit: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!form || fields.length === 0) {
    return (
      <Surface style={styles.container}>
        <Text>Loading form...</Text>
      </Surface>
    );
  }

  // Check if form is closed
  if (form.form_status === "closed") {
    return (
      <Surface style={styles.container}>
        <Card>
          <Card.Content>
            <Text style={styles.title}>Form Closed</Text>
            <Text style={styles.closedMessage}>
              This form is no longer accepting responses.
            </Text>
          </Card.Content>
        </Card>
      </Surface>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: form.theme_color }]}
    >
      {/* FORM HEADER */}
      <Surface style={styles.header}>
        <Text style={styles.formTitle}>{form.name}</Text>
        {form.description && (
          <Text style={styles.formDescription}>{form.description}</Text>
        )}
      </Surface>

      {/* PROGRESS BAR */}
      {form.show_progress_bar && (
        <View style={styles.progressSection}>
          <ProgressBar
            progress={Object.keys(values).filter((k) => values[k]).length / fields.length}
            color={form.theme_color || "#2196F3"}
          />
          <Text style={styles.progressText}>
            {Object.keys(values).filter((k) => values[k]).length} / {fields.length}
          </Text>
        </View>
      )}

      {/* FIELDS */}
      <View style={styles.fieldsContainer}>
        {fields.map((field, idx) => (
          <Card key={field.id} style={styles.fieldCard}>
            <Card.Content>
              {/* LABEL */}
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>
                  {idx + 1}. {field.label}
                </Text>
                {field.is_required && (
                  <Text style={styles.required}>*</Text>
                )}
              </View>

              {/* DESCRIPTION */}
              {field.description && (
                <Text style={styles.fieldDescription}>
                  {field.description}
                </Text>
              )}

              {/* HELP TEXT */}
              {field.help_text && (
                <Text style={styles.helpText}>{field.help_text}</Text>
              )}

              {/* FIELD INPUT BY TYPE */}
              {field.field_type === "text" && (
                <TextInput
                  placeholder={field.placeholder || "Enter text"}
                  value={values[field.id] || ""}
                  onChangeText={(text) => handleChange(field.id, text)}
                  style={styles.input}
                  error={!!errors[field.id]}
                />
              )}

              {field.field_type === "textarea" && (
                <TextInput
                  placeholder={field.placeholder || "Enter text"}
                  value={values[field.id] || ""}
                  onChangeText={(text) => handleChange(field.id, text)}
                  multiline
                  numberOfLines={4}
                  style={styles.textarea}
                  error={!!errors[field.id]}
                />
              )}

              {field.field_type === "number" && (
                <TextInput
                  placeholder={field.placeholder || "Enter number"}
                  value={values[field.id] || ""}
                  onChangeText={(text) => handleChange(field.id, text)}
                  keyboardType="numeric"
                  style={styles.input}
                  error={!!errors[field.id]}
                />
              )}

              {field.field_type === "date" && (
                <TextInput
                  placeholder="YYYY-MM-DD"
                  value={values[field.id] || ""}
                  onChangeText={(text) => handleChange(field.id, text)}
                  style={styles.input}
                  error={!!errors[field.id]}
                />
              )}

              {field.field_type === "select" && field.options && (
                <RadioButton.Group
                  onValueChange={(value) => handleChange(field.id, value)}
                  value={values[field.id] || ""}
                >
                  {field.options.map((option) => (
                    <View key={option} style={styles.radioRow}>
                      <RadioButton value={option} />
                      <Text style={styles.optionText}>{option}</Text>
                    </View>
                  ))}
                </RadioButton.Group>
              )}

              {field.field_type === "dropdown" && field.options && (
                <View style={styles.selectContainer}>
                  {/* Simple dropdown - use native select or implement custom */}
                  <TextInput
                    placeholder="Select an option"
                    value={values[field.id] || ""}
                    style={styles.input}
                    editable={false}
                  />
                </View>
              )}

              {field.field_type === "file" && (
                <Button
                  mode="outlined"
                  onPress={() => pickFile(field.id)}
                  style={styles.button}
                >
                  {values[field.id]?.name
                    ? "Change File: " + values[field.id].name
                    : "Choose File"}
                </Button>
              )}

              {/* ERROR MESSAGE */}
              {errors[field.id] && (
                <Text style={styles.error}>{errors[field.id]}</Text>
              )}
            </Card.Content>
          </Card>
        ))}
      </View>

      {/* SUBMIT BUTTON */}
      <Button
        mode="contained"
        onPress={submitForm}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
      >
        Submit
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    width: '100%',
  },
  header: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  formDescription: {
    fontSize: 14,
    color: "#666",
  },
  progressSection: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 12,
    color: "#999",
    marginTop: 5,
  },
  fieldsContainer: {
    marginBottom: 20,
  },
  fieldCard: {
    marginBottom: 15,
    borderRadius: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  fieldLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  required: {
    color: "red",
    fontSize: 18,
    marginLeft: 5,
  },
  fieldDescription: {
    fontSize: 13,
    color: "#555",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
    fontStyle: "italic",
  },
  input: {
    marginVertical: 10,
    maxWidth: '100%',
  },
  textarea: {
    marginVertical: 10,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  optionText: {
    marginLeft: 10,
    fontSize: 14,
  },
  selectContainer: {
    marginVertical: 10,
  },
  button: {
    marginVertical: 10,
  },
  error: {
    color: "red",
    fontSize: 12,
    marginTop: 5,
  },
  closedMessage: {
    fontSize: 16,
    marginVertical: 20,
    textAlign: "center",
    color: "#666",
  },
  submitButton: {
    marginVertical: 20,
    marginHorizontal: 0,
  },
});
