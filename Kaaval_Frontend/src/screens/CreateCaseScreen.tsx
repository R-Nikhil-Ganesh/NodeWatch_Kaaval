// src/screens/CreateCaseScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useApp } from '../context/AppContext';
import { RootStackParamList, Case } from '../types';

type CreateCaseProp = StackNavigationProp<RootStackParamList, 'CreateCase'>;

export default function CreateCaseScreen({ navigation }: { navigation: CreateCaseProp }) {
  const { addCase, user, loading } = useApp();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');

  const handleCreate = async () => {
    if (!title || !location) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const newCase: Case = {
      caseId: `CASE-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      title,
      location,
      officer: user?.name || 'Unknown',
      status: 'Open',
      evidence: [],
      timestamp: '', // Will be set in context
      blockchainHash: '' // Will be set in context
    };

    try {
      await addCase(newCase);
      Alert.alert('Success', 'Case created and registered on blockchain!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create case');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Initialize New Case</Text>
      <Text style={styles.sub}>This will create a Genesis Block for the case.</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Case Title / Crime Type" 
        placeholderTextColor="#64748b"
        value={title} 
        onChangeText={setTitle}
        editable={!loading}
      />
      <TextInput 
        style={styles.input} 
        placeholder="Location (e.g., Adyar, Chennai)" 
        placeholderTextColor="#64748b"
        value={location} 
        onChangeText={setLocation}
        editable={!loading}
      />

      <TouchableOpacity 
        style={[styles.btn, loading && { opacity: 0.6 }]} 
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.btnText}>Create Case Block</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, justifyContent: 'center' },
  header: { fontSize: 24, color: 'white', fontWeight: 'bold', marginBottom: 5 },
  sub: { color: '#94a3b8', marginBottom: 30 },
  input: { backgroundColor: '#1e293b', color: 'white', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  btn: { backgroundColor: '#38bdf8', padding: 18, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 }
});