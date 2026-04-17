import React, { useState } from "react";
import { Alert } from 'react-native';
import { View, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { Text, TextInput, Button, Switch, Surface, Divider } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { ADMIN_BUTTON_MAX_WIDTH } from "./adminConfig";

const API_BASE =
  "https://indiangroupofschools.com/tasks-app/api";

export default function AdminCreateTaskScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("D");
  const [department, setDepartment] = useState("");
  const [requiresPhoto, setRequiresPhoto] = useState(false);

  const submit = async () => {
  try {
    const form = new URLSearchParams();
    form.append("title", title);
    form.append("frequency", frequency);
    form.append("department", department || "");
    form.append("requires_photo", requiresPhoto ? "1" : "0");

    await axios.post(
      `${API_BASE}/admin_create_task_template.php`,
      form.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    Alert.alert("Success","Task template created");
    setTitle("");
    setDepartment("");
    setRequiresPhoto(false);
  } catch (e) {
    Alert.alert("Error","Failed to create template");
  }
};

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="add-circle" size={28} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.title}>Create Task Template</Text>
            <Text style={styles.subtitle}>Add a new task template to the system</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.form}>
          <TextInput
            label="Task Title"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.input}
            placeholder="Enter task title"
            left={<TextInput.Icon icon="text" />}
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.pickerWrapper}>
              <Picker 
                selectedValue={frequency} 
                onValueChange={setFrequency}
                style={styles.picker}
              >
                <Picker.Item label="Daily" value="D" />
                <Picker.Item label="Weekly" value="W" />
                <Picker.Item label="Monthly" value="M" />
                <Picker.Item label="Yearly" value="Y" />
              </Picker>
            </View>
          </View>

          <TextInput
            label="Department (optional)"
            value={department}
            onChangeText={setDepartment}
            mode="outlined"
            style={styles.input}
            placeholder="Enter department name"
            left={<TextInput.Icon icon="office-building" />}
          />

          <Surface style={styles.switchContainer} elevation={0}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Ionicons name="camera" size={20} color="#64748B" />
                <Text style={styles.switchLabel}>Photo Required</Text>
              </View>
              <Switch 
                value={requiresPhoto} 
                onValueChange={setRequiresPhoto}
                color="#2563EB"
              />
            </View>
          </Surface>

          <Button 
            mode="contained" 
            onPress={submit}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            labelStyle={styles.submitButtonLabel}
            icon="check-circle"
          >
            Create Template
          </Button>
        </View>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 0,
    marginVertical: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  header: {
    flexDirection: "column",
    padding: 16,
    paddingBottom: 16,
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  divider: {
    marginHorizontal: 0,
  },
  form: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    maxWidth: 500,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  picker: {
    height: 45,
  },
  switchContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  submitButton: {
    borderRadius: 10,
    elevation: 0,
    maxWidth: ADMIN_BUTTON_MAX_WIDTH,
  },
  submitButtonContent: {
    paddingVertical: 6,
  },
  submitButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
