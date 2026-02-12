import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as LocalAuthentication from 'expo-local-authentication'; // Biometrics
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { RootStackParamList, User } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SIZES } from '../constants/theme';
import { USERS } from '../data/mockData';

type AuthScreenProp = StackNavigationProp<RootStackParamList, 'Auth'>;

export default function AuthScreen({ navigation }: { navigation: AuthScreenProp }) {
  const { setUser } = useApp();
  
  // Login Phases: 1=Creds, 2=Bio(Admin), 3=OTP
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  
  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  // Temp User State during login flow
  const [tempUser, setTempUser] = useState<User | null>(null);

  // --- PHASE 1: CREDENTIAL CHECK ---
  const handleCredentialCheck = async () => {
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setLoading(false);
      const foundUser = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (foundUser && foundUser.password === password) {
        setTempUser(foundUser);
        
        if (foundUser.role === 'admin') {
          setPhase(2); // Admin needs Biometrics
        } else {
          setPhase(3); // Others go straight to OTP
        }
      } else {
        Alert.alert("Access Denied", "Invalid Credentials");
      }
    }, 1000);
  };

  // --- PHASE 2: BIOMETRICS (ADMIN ONLY) ---
  const handleBiometricCheck = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert("Error", "Biometric hardware not found. Skipping for demo.");
        setPhase(3); // Fallback for emulator
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate Admin Access',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        setPhase(3); // Success -> Go to OTP
      } else {
        Alert.alert("Failed", "Biometric authentication failed.");
      }
    } catch (e) {
      Alert.alert("Error", "Biometric error. Skipping for demo.");
      setPhase(3);
    }
  };

  // --- PHASE 3: OTP VERIFICATION ---
  const handleOtpCheck = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (otp === '1234') { // Hardcoded Mock OTP
        setUser(tempUser); // Log them in globally
        navigation.replace('Dashboard');
      } else {
        Alert.alert("Error", "Invalid OTP. Try '1234'");
      }
    }, 1000);
  };

  // --- RENDER HELPERS ---
  const renderPhase1 = () => (
    <>
      <Text style={styles.label}>Official Email ID</Text>
      <TextInput 
        style={styles.input} 
        placeholder="officer@police.tn.gov" 
        placeholderTextColor={COLORS.textDim}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput 
        style={styles.input} 
        placeholder="••••••••" 
        placeholderTextColor={COLORS.textDim}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.btnMain} onPress={handleCredentialCheck} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.background} /> : (
          <Text style={styles.btnText}>Proceed to Verify</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderPhase2 = () => (
    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
      <Ionicons name="finger-print" size={80} color={COLORS.primary} />
      <Text style={[styles.label, { marginTop: 20, textAlign: 'center' }]}>
        Admin Access Requires Biometric Verification
      </Text>
      
      <TouchableOpacity style={styles.btnMain} onPress={handleBiometricCheck}>
        <Text style={styles.btnText}>Scan Fingerprint / Face</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPhase3 = () => (
    <>
      <Text style={[styles.label, { textAlign: 'center', marginBottom: 20 }]}>
        Enter OTP sent to {tempUser?.email}
      </Text>
      
      <TextInput 
        style={[styles.input, { textAlign: 'center', letterSpacing: 5, fontSize: 24, fontWeight: 'bold' }]} 
        placeholder="----" 
        placeholderTextColor={COLORS.textDim}
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={4}
      />

      <TouchableOpacity style={styles.btnMain} onPress={handleOtpCheck} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.background} /> : (
          <Text style={styles.btnText}>Verify & Login</Text>
        )}
      </TouchableOpacity>

      <Text style={{ textAlign: 'center', color: COLORS.textDim, marginTop: 10 }}>(Demo OTP: 1234)</Text>
    </>
  );

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>ChainGuard</Text>
          <Text style={styles.subtitle}>Tamper-Proof Digital Evidence</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.formTitle}>
            {phase === 1 ? 'Secure Login' : phase === 2 ? 'Biometric Check' : '2FA Verification'}
          </Text>
          
          {phase === 1 && renderPhase1()}
          {phase === 2 && renderPhase2()}
          {phase === 3 && renderPhase3()}

          {/* Reset Flow Button */}
          {phase > 1 && (
            <TouchableOpacity onPress={() => { setPhase(1); setTempUser(null); setOtp(''); }} style={styles.switchBtn}>
              <Text style={styles.link}>Cancel & Restart Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  headerContainer: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: SIZES.h1, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center' },
  subtitle: { fontSize: SIZES.body, color: COLORS.textDim, textAlign: 'center', marginTop: 5 },
  card: { backgroundColor: COLORS.card, padding: SIZES.padding, borderRadius: SIZES.radius },
  formTitle: { fontSize: SIZES.h2, color: COLORS.text, marginBottom: 20, fontWeight: '600', textAlign: 'center' },
  label: { color: COLORS.textDim, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: COLORS.border, color: COLORS.text, padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 16 },
  btnMain: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10, width: '100%' },
  btnText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  link: { color: COLORS.danger },
});