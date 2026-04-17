import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "./apiConfig";

const API = API_BASE;

export default function FmsFormScreen({ formId, onBack }) {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);

  /* LOAD FORM FIELDS */
  useEffect(() => {
    if (!formId) return;

    const loadFields = async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        const res = await fetch(`${API}/forms/list_form_fields.php?form_id=${formId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setFields(Array.isArray(data) ? data : []);
      } catch (e) {
        setFields([]);
      }
    };

    loadFields();
  }, [formId]);

  /* PICK FILE */
  const pickFile = async (fieldId) => {
    const res = await DocumentPicker.getDocumentAsync({});
    if (res.canceled) return;

    setValues((prev) => ({
      ...prev,
      [fieldId]: res.assets[0],
    }));
  };

  /* SUBMIT FORM — FIXED */
  const submit = async () => {
    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("form_id", formId);

      Object.entries(values).forEach(([fieldId, value]) => {
        if (value?.uri) {
          fd.append(`files[${fieldId}]`, {
            uri: value.uri,
            name: value.name,
            type: value.mimeType || "application/octet-stream",
          });
        } else {
          fd.append(`values[${fieldId}]`, value);
        }
      });

      const token = await AsyncStorage.getItem("auth_token");
      const res = await fetch(`${API}/forms/submit_form.php`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd, // ✅ FormData ONLY
      });

      const data = await res.json();

      if (!data.success) {
        alert("Submit failed");
        return;
      }

      alert("Form submitted successfully");
      onBack && onBack();

    } catch (e) {
      console.error(e);
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      {fields.length === 0 && <Text>No form fields found.</Text>}

      {fields.map((f) => (
        <View key={f.id} style={{ marginBottom: 12 }}>
          <Text>{f.label}</Text>

          {f.field_type === "file" ? (
            <Button
              title={values[f.id]?.name || "Upload File"}
              onPress={() => pickFile(f.id)}
            />
          ) : (
            <TextInput
              style={{ borderWidth: 1, padding: 8, marginTop: 4 }}
              value={values[f.id] || ""}
              onChangeText={(t) =>
                setValues((prev) => ({ ...prev, [f.id]: t }))
              }
            />
          )}
        </View>
      ))}

      <Button
        title={loading ? "Submitting..." : "Submit"}
        onPress={submit}
        disabled={loading}
      />
    </ScrollView>
  );
}
