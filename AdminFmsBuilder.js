import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import {
  Text,
  Button,
  TextInput,
  Surface,
  Divider,
  Switch,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Menu } from "react-native-paper";
import apiFetch from "./apiFetch";
import { ADMIN_BUTTON_MAX_WIDTH } from "./adminConfig";

export default function AdminFmsBuilder() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [processes, setProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [steps, setSteps] = useState([]);
  const [users, setUsers] = useState([]);
  const [processMenuVisible, setProcessMenuVisible] = useState(false);

  // PROCESS STATE
  const [processName, setProcessName] = useState("");
  const [processDesc, setProcessDesc] = useState("");
  const [processDuration, setProcessDuration] = useState("");
  const [processUnit, setProcessUnit] = useState("hours");

  // STEP STATE
  const [stepName, setStepName] = useState("");
  const [userId, setUserId] = useState("");
  const [stepDuration, setStepDuration] = useState("");
  const [stepUnit, setStepUnit] = useState("hours");
  const [requiresUpload, setRequiresUpload] = useState(false);

  /* LOAD DATA */
  const loadProcesses = async () => {
    const data = await apiFetch("/fms/list_processes.php");
    setProcesses(Array.isArray(data) ? data : []);
  };

  const loadSteps = async (pid) => {
    const data = await apiFetch(`/fms/get_process_steps.php?process_id=${pid}`);
    setSteps(Array.isArray(data) ? data : []);
  };

  const loadUsers = async () => {
    const data = await apiFetch("/admin_get_users.php");
    setUsers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadProcesses();
    loadUsers();
  }, []);

  /* CREATE PROCESS */
  const createProcess = async () => {
    if (!processName.trim()) {
      alert("Process name is required");
      return;
    }

    try {
      await apiFetch("/fms/create_process.php", {
        method: "POST",
        body: {
          name: processName.trim(),
          description: processDesc.trim(),
          planned_duration: processDuration || 0,
          planned_unit: processUnit,
        },
      });

      setProcessName("");
      setProcessDesc("");
      setProcessDuration("");
      setProcessUnit("hours");
      loadProcesses();
      alert("Process created successfully!");
    } catch (err) {
      alert("Error creating process: " + err.message);
    }
  };

  /* CREATE STEP */
  const createStep = async () => {
    if (!selectedProcess || !stepName.trim() || !userId) {
      alert("Please fill all fields");
      return;
    }

    try {
      await apiFetch("/fms/create_steps.php", {
        method: "POST",
        body: {
          process_id: selectedProcess.id,
          step_order: steps.length + 1,
          step_name: stepName.trim(),
          user_id: parseInt(userId),
          planned_duration: stepDuration || 0,
          planned_unit: stepUnit,
          requires_upload: requiresUpload ? 1 : 0,
        },
      });

      setStepName("");
      setUserId("");
      setStepDuration("");
      setStepUnit("hours");
      setRequiresUpload(false);
      loadSteps(selectedProcess.id);
      alert("Step added successfully!");
    } catch (err) {
      alert("Error creating step: " + err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* CREATE PROCESS CARD */}
      <Surface style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <Ionicons name="add-circle" size={24} color="#2563EB" />
            <Text style={styles.cardTitle}>Create New Process</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.cardContent}>
          <TextInput
            label="Process Name *"
            value={processName}
            onChangeText={setProcessName}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., Document Review"
          />

          <TextInput
            label="Description"
            value={processDesc}
            onChangeText={setProcessDesc}
            mode="outlined"
            style={styles.input}
            placeholder="What is this process about?"
            multiline
            numberOfLines={3}
          />

          <View style={styles.row}>
            <TextInput
              label="Duration"
              value={processDuration}
              onChangeText={setProcessDuration}
              keyboardType="numeric"
              mode="outlined"
              style={[styles.input, { flex: 1, marginRight: 8 }]}
            />
            <TextInput
              label="Unit"
              value={processUnit}
              onChangeText={setProcessUnit}
              mode="outlined"
              style={[styles.input, { flex: 0.8 }]}
            />
          </View>

          <Button mode="contained" onPress={createProcess} style={styles.button}>
            Create Process
          </Button>
        </View>
      </Surface>

      {/* PROCESSES LIST CARD */}
      <Surface style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <Ionicons name="list" size={24} color="#2563EB" />
            <Text style={styles.cardTitle}>Active Processes ({processes.length})</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.cardContent}>
          {processes.length === 0 ? (
            <Text style={styles.emptyText}>No processes yet. Create one above!</Text>
          ) : (
            <Menu
              visible={processMenuVisible}
              onDismiss={() => setProcessMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setProcessMenuVisible(true)}
                  style={styles.dropdownButton}
                  icon="chevron-down"
                >
                  {selectedProcess ? selectedProcess.name : "Select a process..."}
                </Button>
              }
            >
              {processes.map((p) => (
                <Menu.Item
                  key={p.id}
                  title={p.name}
                  onPress={() => {
                    setSelectedProcess(p);
                    loadSteps(p.id);
                    setProcessMenuVisible(false);
                  }}
                />
              ))}
            </Menu>
          )}
        </View>
      </Surface>

      {/* ADD STEPS CARD */}
      {selectedProcess ? (
        <Surface style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleSection}>
              <Ionicons name="layers" size={24} color="#2563EB" />
              <View>
                <Text style={styles.cardTitle}>Process Steps</Text>
                <Text style={styles.cardSubtitle}>{selectedProcess?.name || "Process"}</Text>
              </View>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.cardContent}>
            {steps && steps.length > 0 ? (
              <View style={styles.stepsList}>
                <Text style={styles.stepsTitle}>Current Steps:</Text>
                {steps.map((s, idx) => (
                  <View key={s?.id || idx} style={styles.stepItem}>
                    <Text style={styles.stepNumber}>{idx + 1}</Text>
                    <Text style={styles.stepText}>{s?.step_name || "Unnamed"}</Text>
                  </View>
                ))}
                <Divider style={styles.divider} />
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Add New Step</Text>

            <TextInput
              label="Step Name *"
              value={stepName}
              onChangeText={setStepName}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Manager Review"
            />

            <TextInput
              label="Assign to User ID *"
              value={userId}
              onChangeText={setUserId}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              placeholder="Select from list"
            />

            {userId && (
              <View style={styles.userInfoContainer}>
                <Text style={styles.userInfo}>
                  {users.find((u) => u.id == userId)?.name || "User ID not found"}
                </Text>
              </View>
            )}

            <View style={styles.row}>
              <TextInput
                label="Duration"
                value={stepDuration}
                onChangeText={setStepDuration}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, { flex: 1, marginRight: 8 }]}
              />
              <TextInput
                label="Unit"
                value={stepUnit}
                onChangeText={setStepUnit}
                mode="outlined"
                style={[styles.input, { flex: 0.8 }]}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Requires File Upload</Text>
              <Switch value={requiresUpload} onValueChange={setRequiresUpload} />
            </View>

            <Button mode="contained" onPress={createStep} style={styles.button}>
              Add Step to Process
            </Button>
          </View>
        </Surface>
      ) : null}
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
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  cardTitleSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  cardContent: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    maxWidth: 500,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  processBtn: {
    marginVertical: 6,
  },
  dropdownButton: {
    width: 500,
    maxWidth: "100%",
    justifyContent: "center",
    marginVertical: 6,
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontStyle: "italic",
    paddingVertical: 20,
    fontSize: 14,
    fontWeight: "500",
  },
  stepsList: {
    marginBottom: 20,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 10,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    marginBottom: 6,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "700",
    fontSize: 12,
  },
  stepText: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    marginTop: 8,
  },
  userInfoContainer: {
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  userInfo: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
    marginLeft: 4,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
  },
});
