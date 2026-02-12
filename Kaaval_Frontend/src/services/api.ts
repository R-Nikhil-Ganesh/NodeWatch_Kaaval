// src/services/api.ts
import axios, { AxiosInstance } from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Evidence, Case } from '../types';

// Configure backend URL
// Priority: EXPO_PUBLIC_API_BASE_URL (.env) -> emulator loopback on Android -> localhost
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      // Let axios set Content-Type per request (avoids forcing JSON on multipart uploads)
    });
  }

  // --- CASE PERSISTENCE ---

  async listCases() {
    try {
      const response = await this.api.get('/cases');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getCase(caseID: string) {
    try {
      const response = await this.api.get(`/cases/${caseID}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async createCase(
    payload: Partial<Case>,
    userMeta?: { userId?: string; userRole?: string; userOrg?: string }
  ) {
    try {
      const response = await this.api.post('/cases', {
        ...payload,
        // Forward audit metadata so backend does not default to "unknown"
        userId: userMeta?.userId,
        userRole: userMeta?.userRole,
        userOrg: userMeta?.userOrg,
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async uploadCaseEvidence(
    caseID: string,
    fileUri: string,
    opts: {
      name?: string;
      type?: string;
      timestamp?: string;
      location?: string;
      hash?: string;
      userId?: string;
      userRole?: string;
      userOrg?: string;
    } = {}
  ) {
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) {
        console.error('uploadCaseEvidence: file does not exist', fileUri);
        throw new Error('Local file missing before upload');
      }

      const form = new FormData();
      const baseName = opts.name || `evidence_${Date.now()}`;
      const fileName = baseName.match(/\.\w+$/) ? baseName : `${baseName}.jpg`;
      const safeUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri.replace(/^\//, '')}`;
      const mime = opts.type && opts.type.includes('/') ? opts.type : 'image/jpeg';

      form.append('file', {
        uri: safeUri,
        name: fileName,
        type: mime,
      } as any);

      if (opts.name) form.append('name', opts.name);
      if (opts.type) form.append('type', opts.type);
      if (opts.timestamp) form.append('timestamp', opts.timestamp);
      if (opts.location) form.append('location', opts.location);
      if (opts.hash) form.append('hash', opts.hash);
      if (opts.userId) form.append('userId', opts.userId);
      if (opts.userRole) form.append('userRole', opts.userRole);
      if (opts.userOrg) form.append('userOrg', opts.userOrg);

      const url = `${API_BASE_URL}/cases/${caseID}/evidence`;
      console.log('uploadCaseEvidence -> POST (fetch)', { url, safeUri, fileName, type: mime, size: info.size });

      const res = await fetch(url, {
        method: 'POST',
        body: form,
        // Do NOT set Content-Type; fetch will add correct multipart boundary
      } as any);

      if (!res.ok) {
        const text = await res.text();
        console.error('uploadCaseEvidence <- non-200', { status: res.status, text });
        throw new Error(text || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      console.log('uploadCaseEvidence <- response', res.status);
      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // --- EVIDENCE ENDPOINTS ---

  /**
   * Upload/Create evidence
   * POST /evidence
   */
  async createEvidence(
    evidenceID: string,
    caseID: string,
    fileHash: string,
    metaHash: string,
    riskLevel: string
  ) {
    try {
      const response = await this.api.post('/evidence', {
        evidenceID,
        caseID,
        fileHash,
        metaHash,
        riskLevel,
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Read evidence with audit log
   * GET /evidence/:id
   */
  async readEvidence(evidenceID: string) {
    try {
      const response = await this.api.get(`/evidence/${evidenceID}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get evidence history (audit trail)
   * GET /evidence/history/:id
   */
  async getEvidenceHistory(evidenceID: string) {
    try {
      const response = await this.api.get(`/evidence/history/${evidenceID}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // --- CASE ENDPOINTS ---

  /**
   * Query evidence by case ID
   * GET /case/:id
   */
  async queryCaseEvidence(caseID: string) {
    try {
      const response = await this.api.get(`/case/${caseID}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // --- TRANSFER ENDPOINTS ---

  /**
   * Request evidence transfer
   * POST /transfer/request
   */
  async requestTransfer(evidenceID: string, targetMSP: string) {
    try {
      const response = await this.api.post('/transfer/request', {
        evidenceID,
        targetMSP,
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Accept evidence transfer
   * POST /transfer/accept
   */
  async acceptTransfer(evidenceID: string) {
    try {
      const response = await this.api.post('/transfer/accept', {
        evidenceID,
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // --- ERROR HANDLING ---

  private handleError(error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      const requestInfo = error.request ? { url: error.request?._url, method: error.config?.method } : undefined;
      console.error('API Error detail:', {
        message: error.message,
        status,
        data,
        request: requestInfo,
      });
      const message = (data && (data.error || data.message)) || error.message;
      throw new Error(message);
    }
    throw error;
  }
}

// Export singleton instance
export const apiService = new ApiService();
