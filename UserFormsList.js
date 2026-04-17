import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Text, Button, Surface } from "react-native-paper";
import apiFetch from "./apiFetch";

export default function UserFormsList({ onOpenForm }) {
  const [forms, setForms] = useState([]);

  useEffect(() => {
    apiFetch("/forms/user_assigned_forms.php")
      .then((res) => setForms(Array.isArray(res) ? res : []));
  }, []);

  return (
    <ScrollView style={{ padding: 16 }}>
      <Surface style={{ padding: 16, backgroundColor: 'transparent' }}>
        <Text variant="titleMedium">My Forms</Text>

        {forms.length === 0 && (
          <Text>No forms assigned</Text>
        )}

        {forms.map((f) => (
          <Button
            key={f.form_id}
            mode="outlined"
            style={{ marginVertical: 6 }}
            onPress={() => onOpenForm(f.form_id)}
          >
            {f.name}
          </Button>
        ))}
      </Surface>
    </ScrollView>
  );
}
