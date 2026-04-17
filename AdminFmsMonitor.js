import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Linking } from "react-native";
import apiFetch from "./apiFetch";

export default function AdminFmsMonitor() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      const res = await apiFetch("/fms/admin_overview.php");
      setRows(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load FMS overview", err);
      setRows([]);
    }
  };

  return (
    <View>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.wide}>Process</Text>
        <Text style={styles.cell}>Step</Text>
        <Text style={styles.cell}>Status</Text>
        <Text style={styles.cell}>Delay</Text>
        <Text style={styles.cell}>File</Text>
      </View>

      {/* ROWS */}
      <FlatList
        data={rows}
        keyExtractor={(item, i) =>
          item.instance_step_id?.toString() || i.toString()
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.wide}>{item.reference_title}</Text>
            <Text style={styles.cell}>{item.step_name}</Text>
            <Text style={styles.cell}>{item.status}</Text>
            <Text style={styles.cell}>{item.time_delay ?? "-"}</Text>
            <Text
              style={[styles.cell, styles.link]}
              onPress={() =>
                item.upload_path && Linking.openURL(item.upload_path)
              }
            >
              {item.upload_path ? "Download" : "-"}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ padding: 16, color: "#666" }}>
            No running FMS instances
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingVertical: 8,
    backgroundColor: "#f1f5f9",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  cell: {
    flex: 1,
  },
  wide: {
    flex: 2,
    fontWeight: "600",
  },
  link: {
    color: "blue",
  },
});
