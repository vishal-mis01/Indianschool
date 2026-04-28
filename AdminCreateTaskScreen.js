import React, { useState } from "react";
import { Alert, View, StyleSheet, ScrollView } from "react-native";
import { Text, TextInput, Button, Switch, Surface } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";

const API_BASE = "https://indiangroupofschools.com/tasks-app/api";

export default function AdminCreateTaskScreen() {
  const [tasks, setTasks] = useState([
    { title: "", frequency: "D", department: "", requiresPhoto: false, timing: "" },
  ]);

  const addRow = () => {
    setTasks([
      ...tasks,
      { title: "", frequency: "D", department: "", requiresPhoto: false, timing: "" },
    ]);
  };

  const removeRow = (index) => {
    const updated = [...tasks];
    updated.splice(index, 1);
    setTasks(updated);
  };

  const updateField = (index, field, value) => {
    const updated = [...tasks];
    updated[index][field] = value;
    setTasks(updated);
  };

  const submit = async () => {
    try {
      const validTasks = tasks.filter(
        (t) => t.title.trim() && t.frequency && t.timing.trim()
      );

      if (validTasks.length !== tasks.length) {
        Alert.alert("Error", "Please fill Title, Frequency and Timing for all rows.");
        return;
      }

      await Promise.all(
        validTasks.map((t) => {
          const formData = new FormData();
          formData.append("title", t.title);
          formData.append("frequency", t.frequency);
          formData.append("department", t.department);
          formData.append("requires_photo", t.requiresPhoto ? "1" : "0");
          formData.append("timing", t.timing);

          return axios.post(`${API_BASE}/admin_create_task_template.php`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
        })
      );

      Alert.alert("Success", "All templates created");
      setTasks([
        { title: "", frequency: "D", department: "", requiresPhoto: false },
      ]);
    } catch (e) {
      const errorMessage = e?.response?.data?.error || e.message || "Failed to create templates";
      Alert.alert("Error", errorMessage);
    }
  };

  return (
    <ScrollView horizontal>
      <ScrollView style={styles.container}>
        <Surface style={styles.card}>
          <Text style={styles.title}>Create Task Templates</Text>

          {/* HEADER ROW */}
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.headerCell, styles.colTitle]}>Task Title</Text>
            <Text style={[styles.headerCell, styles.colFrequency]}>Frequency</Text>
            <Text style={[styles.headerCell, styles.colDepartment]}>Department</Text>
            <Text style={[styles.headerCell, styles.colPhoto]}>Photo</Text>
            <Text style={[styles.headerCell, styles.colTiming]}>Timing</Text>
            <Text style={[styles.headerCell, styles.colAction]}>Action</Text>
          </View>

          {/* DATA ROWS */}
          {tasks.map((task, index) => (
            <View key={index} style={styles.row}>

              <TextInput
                value={task.title}
                onChangeText={(val) => updateField(index, "title", val)}
                style={[styles.cellInput, styles.colTitle]}
                placeholder="Title"
              />

              <View style={[styles.cellPicker, styles.colFrequency]}>
                <Picker
                  selectedValue={task.frequency}
                  onValueChange={(val) => updateField(index, "frequency", val)}
                >
                  <Picker.Item label="D" value="D" />
                  <Picker.Item label="W" value="W" />
                  <Picker.Item label="M" value="M" />
                  <Picker.Item label="Y" value="Y" />
                </Picker>
              </View>

              <TextInput
                value={task.department}
                onChangeText={(val) => updateField(index, "department", val)}
                style={[styles.cellInput, styles.colDepartment]}
                placeholder="Department"
              />

              <View style={[styles.cellSwitch, styles.colPhoto]}>
                <Switch
                  value={task.requiresPhoto}
                  onValueChange={(val) => updateField(index, "requiresPhoto", val)}
                />
              </View>

              <TextInput
                value={task.timing}
                onChangeText={(val) => updateField(index, "timing", val)}
                style={[styles.cellInput, styles.colTiming]}
                placeholder="HH:MM"
              />

              <View style={styles.colAction}>
                <Button onPress={() => removeRow(index)} textColor="red">
                  ❌
                </Button>
              </View>

            </View>
          ))}

          <Button mode="outlined" onPress={addRow} style={{ marginTop: 10 }}>
            + Add Row
          </Button>

          <Button mode="contained" onPress={submit} style={{ marginTop: 10 }}>
            Create Templates
          </Button>
        </Surface>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },

  card: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#2a289c",
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  colTitle: { flex: 2 },
  colFrequency: { flex: 1 },
  colDepartment: { flex: 2 },
  colPhoto: { flex: 1 },
  colTiming: { flex: 1.5 },
  colAction: { flex: 0.7 },

  headerCell: {
    flex: 1,
    fontWeight: "bold",
    textAlign: "center",
  },

  cellInput: {
    flex: 1,
    marginRight: 5,
    height: 45,
  },

  cellPicker: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: "rgb(41, 58, 43)",
    marginRight: 5,
  },

  cellSwitch: {
    flex: 0.7,
    alignItems: "center",
  },

  cellPicker: {
    width: 120,
    height: 45,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 5,
  },

  cellSwitch: {
    width: 100,
    alignItems: "center",
  },

  headerCell: {
    fontWeight: "bold",
    textAlign: "center",
  },

  cellInput: {
    marginRight: 5,
    height: 45,
  },

  cellPicker: {
    height: 45,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 5,
  },

  cellSwitch: {
    alignItems: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  }


});