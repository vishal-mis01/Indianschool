
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Picker, TextInput, TouchableOpacity } from 'react-native';
import axios from 'axios';


const API_BASE = 'https://indiangroupofschools.com/tasks-app/api';


export default function CreateUserScreen({ user }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      const params = new URLSearchParams();
      params.append('admin_id', user?.user_id);
      params.append('name', name);
      params.append('email', email);
      params.append('department', department);
      params.append('role', role);
      const res = await axios.post(
        `${API_BASE}/admin_create_user.php`,
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      if (res.data && res.data.success) {
        setSuccess("User created! Password: " + res.data.password);
        setName(""); setEmail(""); setDepartment(""); setRole("user");
      } else {
        setError(res.data.error || "Failed to create user");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Create User</Text>
      {success ? <Text style={{ color: 'green', marginBottom: 8 }}>{success}</Text> : null}
      {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Department"
        value={department}
        onChangeText={setDepartment}
      />
      <View style={styles.pickerWrapper}>
        <Text style={{ marginBottom: 4 }}>Role:</Text>
        <Picker
          selectedValue={role}
          style={styles.picker}
          onValueChange={(itemValue) => setRole(itemValue)}
        >
          <Picker.Item label="User" value="user" />
          <Picker.Item label="Process Coordinator" value="process_coordinator" />
          <Picker.Item label="Executive Assistant" value="ea" />
          <Picker.Item label="Managing Director" value="md" />
        </Picker>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? "Creating..." : "Create User"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    fontSize: 16
  },
  pickerWrapper: { marginBottom: 16 },
  picker: { height: 44, width: '100%' },
  button: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
