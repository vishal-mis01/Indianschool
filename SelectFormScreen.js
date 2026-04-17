import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import apiFetch from "./apiFetch";

export default function SelectFormScreen({ onSelect }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/forms/list_forms.php");
      setForms(Array.isArray(res) ? res : []);
    } catch (e) {
      setError("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Select a Form</Text>
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={{ color: 'red', marginTop: 20 }}>{error}</Text>
      ) : (
        forms.map((form) => (
          <TouchableOpacity
            key={form.id}
            style={styles.formBtn}
            onPress={() => onSelect(form.id)}
          >
            <Text style={styles.formName}>{form.name}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  formBtn: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formName: { fontSize: 16, fontWeight: '600' },
});