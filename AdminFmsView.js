import React, { useEffect, useState } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { Text, Card, DataTable, Button } from "react-native-paper";
import apiFetch from "./apiFetch";
import { ADMIN_BUTTON_MAX_WIDTH } from "./adminConfig";

export default function AdminFmsView() {
  const [processes, setProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [instances, setInstances] = useState([]);

  useEffect(() => {
    loadProcessCards();
  }, []);

  const loadProcessCards = async () => {
    const res = await apiFetch("/fms/admin_fms_process_cards.php");
    setProcesses(Array.isArray(res) ? res : []);
  };

  const openProcess = async (process) => {
    setSelectedProcess(process);
    const res = await apiFetch(
      `/fms/admin_fms_process_view.php?process_id=${process.process_id}`
    );
    setInstances(Array.isArray(res) ? res : []);
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      {!selectedProcess && (
        <>
          <Text variant="titleLarge" style={{ marginBottom: 12 }}>
            FMS Processes
          </Text>

          {processes.map((p) => (
            <Card
              key={p.process_id}
              style={styles.card}
              onPress={() => openProcess(p)}
            >
              <Card.Content>
                <Text variant="titleMedium">{p.process_name}</Text>
                <Text>Total Instances: {p.total_instances}</Text>
                <Text>Completed: {p.completed_instances}</Text>
              </Card.Content>
            </Card>
          ))}
        </>
      )}

      {selectedProcess && (
        <>
          <Button
            mode="outlined"
            onPress={() => setSelectedProcess(null)}
            style={{ marginBottom: 10 }}
          >
            ← Back to Processes
          </Button>

          <Text variant="titleLarge" style={{ marginBottom: 10 }}>
            {selectedProcess.process_name}
          </Text>

          <DataTable>
            <DataTable.Header>
              <DataTable.Title>ID</DataTable.Title>
              <DataTable.Title>Started By</DataTable.Title>
              <DataTable.Title numeric>Progress</DataTable.Title>
              <DataTable.Title>Status</DataTable.Title>
            </DataTable.Header>

            {instances.map((row) => (
              <DataTable.Row key={row.instance_id}>
                <DataTable.Cell>{row.instance_id}</DataTable.Cell>
                <DataTable.Cell>{row.started_by}</DataTable.Cell>
                <DataTable.Cell numeric>
                  {row.progress_percent}%
                </DataTable.Cell>
                <DataTable.Cell>
                  {row.status === "completed" ? "✅ Completed" : "⏳ Running"}
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
});
