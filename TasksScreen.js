import React from "react";
import { View, Text } from "react-native";

export default function TasksScreen({ user }) {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 22 }}>Welcome</Text>
      <Text>User ID: {user?.user_id}</Text>
      <Text>Department: {user?.department}</Text>
    </View>
  );
}
