// src/services/api.ts
import axios, { AxiosInstance } from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Evidence, Case } from '../types';

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:4000`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }

  return 'http://localhost:4000';
}

export const API_BASE_URL = getApiBaseUrl();

const normalizeFileUri = (uri?: string) => {
  if (!uri) return uri;
  if (uri.startsWith('/files/')) {
    return `${API_BASE_URL}${uri}`;
  }

  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    try {
      const url = new URL(uri);
      if (url.pathname.startsWith('/files/')) {
        const base = new URL(API_BASE_URL);
        url.protocol = base.protocol;
        url.host = base.host;
        return url.toString();
      }
    } catch {
      return uri;
    }
  }

  return uri;
};

const normalizeEvidenceUris = (caseItem: Case) => {
  if (!caseItem?.evidence?.length) return caseItem;
  const evidence = caseItem.evidence.map(item => ({
    ...item,
    uri: normalizeFileUri(item.uri),
  }));
  return { ...caseItem, evidence };
};
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
      const cases = (response.data || []).map((item: Case) => normalizeEvidenceUris(item));
      return cases;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getCase(caseID: string) {
    try {
      const response = await this.api.get(`/cases/${caseID}`);
      return normalizeEvidenceUris(response.data as Case);
    } catch (error) {
      this.handleError(error);
    }
  }

  // --- USERS ---
  // Backs the admin dashboard's officer/forensics counts, which previously
  // read from a users array that was only ever appended to by registration
  // and so always rendered zero.
  async listUsers() {
    try {
      const response = await this.api.get('/api/users');
      return response.data || [];
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
      evidenceId?: string;
      userId?: string;
      userRole?: string;
      userOrg?: string;
    } = {}
  ) {
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) {
        console.error('uploadCaseEvidence: file does not exist', fileUri);
        const missing: any = new Error('Local file missing before upload');
        missing.code = 'LOCAL_FILE_MISSING';
        throw missing;
      }

      const form = new FormData();
      // Derive the real extension/mime from the local file (gallery picks can
      // be PNG/HEIC etc.) instead of labelling everything .jpg / image/jpeg.
      const uriExt = (fileUri.split('?')[0].match(/\.(\w{2,5})$/)?.[1] || 'jpg').toLowerCase();
      const MIME_BY_EXT: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
        webp: 'image/webp', heic: 'image/heic', bmp: 'image/bmp',
        mp4: 'video/mp4', mov: 'video/quicktime', pdf: 'application/pdf',
      };
      const baseName = opts.name || `evidence_${Date.now()}`;
      const fileName = baseName.match(/\.\w+$/) ? baseName : `${baseName}.${uriExt}`;
      const safeUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
      const mime = MIME_BY_EXT[uriExt] || 'image/jpeg';

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
      // Stable client-generated id makes retries idempotent on the server.
      if (opts.evidenceId) form.append('evidenceId', opts.evidenceId);
      if (opts.userId) form.append('userId', opts.userId);
      if (opts.userRole) form.append('userRole', opts.userRole);
      if (opts.userOrg) form.append('userOrg', opts.userOrg);

      const url = `${API_BASE_URL}/cases/${caseID}/evidence`;
      console.log('uploadCaseEvidence -> POST (fetch)', { url, safeUri, fileName, type: mime, size: info.size });

      // fetch has no built-in timeout: on a dead/captive network the upload
      // would hang forever with the UI stuck on "loading". Abort after 90s so
      // it falls into the offline/queued path (no `status` set on the error).
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90000);
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          body: form,
          signal: controller.signal,
          // Do NOT set Content-Type; fetch will add correct multipart boundary
        } as any);
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        const text = await res.text();
        console.error('uploadCaseEvidence <- non-200', { status: res.status, text });
        let message = text;
        try {
          const parsed = JSON.parse(text);
          message = parsed.error || parsed.message || text;
        } catch {
          // text wasn't JSON — use as-is
        }
        const err: any = new Error(message || `Upload failed with status ${res.status}`);
        // Distinguishes "reached the server, it rejected the request" (status set —
        // not retryable, must surface to the user) from a genuine network/offline
        // failure (no status — safe to silently queue for the sync worker).
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      console.log('uploadCaseEvidence <- response', res.status);
      if (data?.evidence?.uri) {
        data.evidence.uri = normalizeFileUri(data.evidence.uri);
      }
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
      const err: any = new Error(message);
      // Set only when the server actually responded (a real rejection, not
      // retryable) — undefined here means no response was received at all,
      // i.e. a genuine network/offline failure, safe to queue for later retry.
      if (status) err.status = status;
      throw err;
    }
    throw error;
  }
}

// Export singleton instance
export const apiService = new ApiService();
