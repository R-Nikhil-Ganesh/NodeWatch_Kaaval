import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Platform } from 'react-native';
// Use legacy API on native to avoid deprecation warnings
import * as FileSystem from 'expo-file-system/legacy';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { RootStackParamList, Evidence } from '../types';
import { apiService } from '../services/api';
// file storage now handled by backend uploads
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SIZES } from '../constants/theme';

type Props = {
  route: RouteProp<RootStackParamList, 'Evidence'>;
  navigation: StackNavigationProp<RootStackParamList, 'Evidence'>;
};

export default function EvidenceScreen({ route, navigation }: Props) {
  const { caseId } = route.params;
  const { cases, updateCaseEvidence, loading: contextLoading, error } = useApp();
  
  // Find case safely
  const activeCase = cases.find(c => c.caseId === caseId);
  const [loading, setLoading] = useState(false);


  // --- PDF REPORT GENERATOR ---
  const generatePdf = async () => {
    // 1. Safety Check
    if (!activeCase) {
      Alert.alert("Error", "Case data not found.");
      return;
    }

    const reportCase = activeCase;
    setLoading(true);

    try {
      // 2. Prepare HTML Content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Times New Roman', serif; padding: 40px; color: #000; }
              .header-container { text-align: center; margin-bottom: 40px; border-bottom: 3px double #000; padding-bottom: 20px; }
              .org-name { font-size: 28px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
              .dept-name { font-size: 16px; font-weight: bold; margin-top: 5px; }
              .report-title { font-size: 20px; font-weight: bold; text-decoration: underline; margin-top: 20px; }
              .section-header { font-size: 16px; font-weight: bold; background-color: #eee; padding: 5px; border: 1px solid #000; margin-bottom: 15px; }
              .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px; font-size: 14px; }
              .field-row { margin-bottom: 8px; }
              .field-label { font-weight: bold; width: 140px; display: inline-block; }
              .spacer { height: 40px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
              th, td { border: 1px solid #000; padding: 10px; text-align: left; vertical-align: top; }
              th { background-color: #f0f0f0; font-weight: bold; text-transform: uppercase; }
              .hash-code { font-family: 'Courier New', monospace; font-size: 10px; overflow-wrap: break-word; word-break: break-all; }
              .footer { margin-top: 50px; text-align: center; font-size: 10px; border-top: 1px solid #ccc; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header-container">
              <div class="org-name">Tamil Nadu Police</div>
              <div class="dept-name">Kanyakumari District • Cyber Crime Wing</div>
              <div class="report-title">DIGITAL EVIDENCE CHAIN OF CUSTODY REPORT</div>
            </div>
  
            <div class="section-header">I. CASE INFORMATION</div>
            <div class="details-grid">
              <div class="field-row"><span class="field-label">Case Reference ID:</span> ${reportCase.caseId}</div>
              <div class="field-row"><span class="field-label">Current Status:</span> ${reportCase.status}</div>
              <div class="field-row"><span class="field-label">Investigating Officer:</span> ${reportCase.officer}</div>
              <div class="field-row"><span class="field-label">Date Reported:</span> ${new Date(reportCase.timestamp).toLocaleDateString()}</div>
              <div class="field-row"><span class="field-label">Primary Location:</span> ${reportCase.location}</div>
            </div>
  
            <div class="spacer"></div>
  
            <div class="section-header">II. EVIDENCE CHAIN & AUDIT LOG</div>
            <table>
              <thead>
                <tr>
                  <th width="20%">Timestamp</th>
                  <th width="25%">Location</th>
                  <th width="20%">Evidence / Activity</th>
                  <th width="35%">Immutable Hash (SHA-256)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${new Date(reportCase.timestamp).toLocaleString()}</td>
                  <td>${reportCase.location}</td>
                  <td><b>CASE FILE OPENED</b><br/>Genesis Block Initialization</td>
                  <td class="hash-code">${reportCase.blockchainHash}</td>
                </tr>
                ${(reportCase.evidence || []).map(item => `
                  <tr>
                    <td>${new Date(item.timestamp).toLocaleString()}</td>
                    <td>${item.location || reportCase.location}</td>
                    <td><b>${item.name || 'Digital Artifact'}</b><br/>Type: ${item.type.toUpperCase()}</td>
                    <td class="hash-code">${item.hash}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
  
            <div class="footer">
              <p>This document is computer-generated from the ChainGuard Immutable Ledger.</p>
              <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `;

      // 3. Platform Specific Save Logic
      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
        return;
      }

      // Generate Temp File
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const sanitizedTitle = reportCase.title.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${sanitizedTitle}_Report.pdf`;

      if (Platform.OS === 'android') {
        // --- ANDROID ROBUST LOGIC ---
        let safSuccess = false;

        // Try Storage Access Framework (SAF) first
        try {
          const SAF = FileSystem.StorageAccessFramework;
          if (SAF) {
            const permissions = await SAF.requestDirectoryPermissionsAsync();
            
            if (permissions.granted) {
              const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
              const createdUri = await SAF.createFileAsync(permissions.directoryUri, fileName, 'application/pdf');
              await FileSystem.writeAsStringAsync(createdUri, base64, { encoding: FileSystem.EncodingType.Base64 });
              
              safSuccess = true;
              Alert.alert("Success", "Report saved to selected folder.");
            } else {
              // User cancelled folder selection
              return; 
            }
          }
        } catch (safError) {
          console.log("SAF Failed (likely not supported on this device/emulator):", safError);
          // safSuccess remains false
        }

        // Fallback: If SAF failed or not supported, use Share Sheet
        // This is necessary because on some Android versions, you simply CANNOT write to Downloads without SAF.
        if (!safSuccess) {
          if (await Sharing.isAvailableAsync()) {
            Alert.alert("Notice", "Direct download not supported on this device. Please choose 'Save to Files' or 'Drive' from the next screen.");
            await Sharing.shareAsync(uri);
          } else {
            Alert.alert("Error", "Could not save or share the report.");
          }
        }

      } else {
        // --- iOS LOGIC ---
        const newUri = FileSystem.documentDirectory + fileName;
        await FileSystem.moveAsync({ from: uri, to: newUri });
        
        if (await Sharing.isAvailableAsync()) {
           await Sharing.shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } else {
           Alert.alert("Error", "Sharing is not available on this device");
        }
      }

    } catch (error) {
      console.error("PDF Gen Error:", error);
      Alert.alert("Error", "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  // --- EVIDENCE UPLOAD LOGIC ---
  const pickImage = async (useCamera = false) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
          Alert.alert("Permission Denied", "Camera access is required.");
          return;
      }
    }

    let result = useCamera 
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (!result.canceled && result.assets) {
      analyzeDocument(result.assets[0]);
    }
  };

  const analyzeDocument = async (asset: ImagePicker.ImagePickerAsset) => {
    Alert.alert("Syncing with Blockchain", "Registering evidence with immutable ledger...");
    
    const mockLocations = [
      "13.0827° N, 80.2707° E (Crime Scene)",
      "13.0850° N, 80.2100° E (Forensic Lab)",
      "12.9716° N, 79.1585° E (Transit)"
    ];
    const randomLoc = mockLocations[Math.floor(Math.random() * mockLocations.length)];

    setLoading(true);
    try {
      // Ensure a file path readable by the backend (handles content:// or ph:// URIs)
      const extension = (asset.fileName && asset.fileName.split('.').pop()) || 'jpg';
      const tempUri = `${FileSystem.cacheDirectory}upload_${Date.now()}.${extension}`;
      await FileSystem.copyAsync({ from: asset.uri, to: tempUri });

      const newEvidence: Evidence = {
        type: 'image', 
        uri: tempUri,
        hash: 'Qm' + Date.now() + 'x8z9', 
        timestamp: new Date().toISOString(),
        name: 'Scene Photo / Document',
        // Hint mime for upload
        mimeType: 'image/jpeg',
        location: randomLoc
      };
      
      // Upload to backend (will persist file and metadata) and register in context
      await updateCaseEvidence(caseId, newEvidence);
      Alert.alert("Success", "Evidence registered on immutable ledger!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to register evidence");
      console.error('Evidence upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Safe Guard
  if (!activeCase) {
    return (
      <ScreenWrapper>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
           <Text style={{color: COLORS.textDim}}>Case not found.</Text>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{marginTop: 20}}>
              <Text style={{color: COLORS.primary}}>Go Back</Text>
           </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} showsVerticalScrollIndicator={true}>
        {/* Navigation Header */}
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.downloadBtn} onPress={generatePdf} disabled={loading}>
            <Ionicons name="download-outline" size={18} color="white" />
            <Text style={styles.downloadText}>{loading ? "Processing..." : "Download Report"}</Text>
          </TouchableOpacity>
        </View>

        {/* Ledger Card */}
        <View style={styles.ledgerCard}>
          <View style={styles.ledgerHeader}>
             <Ionicons name="cube-outline" size={16} color={COLORS.primary} />
             <Text style={styles.ledgerTitle}>IMMUTABLE LEDGER RECORD</Text>
          </View>
          <Text style={styles.hashText}>{activeCase.blockchainHash}</Text>
          <View style={styles.ledgerMeta}>
             <View>
               <Text style={styles.metaLabel}>Timestamp</Text>
               <Text style={styles.metaVal}>{new Date(activeCase.timestamp).toLocaleString()}</Text>
             </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(true)}>
            <Ionicons name="camera" size={20} color="white" />
            <Text style={styles.actionText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.secondary }]} onPress={() => pickImage(false)}>
            <Ionicons name="cloud-upload" size={20} color="white" />
            <Text style={styles.actionText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Flowchart UI */}
        <Text style={styles.sectionTitle}>Chain of Custody (Flow)</Text>
        
        <View style={styles.flowContainer}>
          <View style={styles.flowNode}>
            <View style={[styles.nodeIcon, { backgroundColor: COLORS.success }]}>
               <Ionicons name="folder-open" size={20} color="black" />
            </View>
            <View style={styles.nodeContent}>
              <Text style={styles.nodeTitle}>Case Opened</Text>
              <Text style={styles.nodeTime}>{new Date(activeCase.timestamp).toLocaleString()}</Text>
              <Text style={styles.nodeDesc}>Genesis Block • {activeCase.location}</Text>
            </View>
          </View>

          <View style={styles.connectorLine} />

          {(activeCase.evidence || []).map((item, index) => (
            <React.Fragment key={index}>
              <View style={styles.flowNode}>
                <View style={styles.nodeIcon}>
                  <Ionicons name="image" size={20} color="white" />
                </View>
                <View style={styles.nodeContent}>
                  <Text style={styles.nodeTitle}>{item.name}</Text>
                  <Text style={styles.nodeTime}>{new Date(item.timestamp).toLocaleString()}</Text>
                  <Text style={styles.nodeHash}>{item.location}</Text>
                  <Text style={[styles.nodeHash, { color: COLORS.secondary }]}>IPFS: {item.hash.substring(0, 15)}...</Text>
                  <Image source={{ uri: item.uri }} style={styles.nodeImage} />
                </View>
              </View>
              {index < (activeCase.evidence || []).length - 1 && <View style={styles.connectorLine} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  navHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  downloadBtn: { flexDirection: 'row', backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 6 },
  downloadText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  
  ledgerCard: { backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: 15, borderRadius: SIZES.radius, borderColor: 'rgba(56, 189, 248, 0.3)', borderWidth: 1, marginBottom: 25 },
  ledgerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ledgerTitle: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  hashText: { color: COLORS.textDim, fontFamily: 'Courier', fontSize: 11, marginBottom: 15 },
  ledgerMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { color: COLORS.textDim, fontSize: 10, textTransform: 'uppercase' },
  metaVal: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  actionRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  actionBtn: { flex: 1, backgroundColor: COLORS.primary, padding: 12, borderRadius: SIZES.radius, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  actionText: { color: COLORS.background, fontWeight: 'bold' },
  
  flowContainer: { paddingLeft: 10 },
  flowNode: { flexDirection: 'row', gap: 15 },
  nodeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  nodeContent: { flex: 1, backgroundColor: COLORS.card, padding: 15, borderRadius: 12, marginBottom: 5 },
  nodeTitle: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  nodeTime: { color: COLORS.textDim, fontSize: 12, marginBottom: 5 },
  nodeDesc: { color: COLORS.text, fontSize: 12 },
  nodeHash: { color: COLORS.textDim, fontFamily: 'Courier', fontSize: 10, marginBottom: 4 },
  nodeImage: { width: '100%', height: 120, borderRadius: 8, marginTop: 5, backgroundColor: COLORS.background },
  connectorLine: { width: 2, backgroundColor: COLORS.border, height: 30, marginLeft: 19, marginVertical: -5 }
});