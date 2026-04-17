import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { getFormFields, createFormField } from '../services/fmsFormService';

export default function AdminFmsFormBuilderScreen({ route }) {
  const { processId } = route.params;

  const [fields, setFields] = useState([]);
  const [label, setLabel] = useState('');
  const [type, setType] = useState('text');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await getFormFields(processId);
    setFields(res);
  };

  const addField = async () => {
    await createFormField({
      process_id: processId,
      field_label: label,
      field_type: type,
      field_key: label.toLowerCase().replace(/\s+/g, '_'),
    });
    setLabel('');
    load();
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Add Field</Text>

      <TextInput
        placeholder="Field Label"
        value={label}
        onChangeText={setLabel}
        style={{ borderWidth: 1, marginBottom: 10 }}
      />

      <TextInput
        placeholder="Type (text, number, date, textarea)"
        value={type}
        onChangeText={setType}
        style={{ borderWidth: 1, marginBottom: 10 }}
      />

      <Button title="Add Field" onPress={addField} />

      <Text style={{ marginTop: 20 }}>Existing Fields</Text>
      {fields.map((f) => (
        <Text key={f.field_key}>• {f.field_label}</Text>
      ))}
    </View>
  );
}
