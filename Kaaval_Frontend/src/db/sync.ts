/**
 * src/db/sync.ts
 *
 * Offline sync worker.
 *
 * Strategy (offline-first):
 * 1. All mutations write to the local SQLite DB + enqueue a row in sync_queue.
 * 2. This worker is triggered on:
 *    - App foreground (AppState change to 'active')
 *    - Network reconnection (@react-native-community/netinfo)
 *    - Manual call from AppContext after a successful online operation
 * 3. It reads PENDING rows from sync_queue and POSTs them to Kaaval_Backend.
 * 4. On success the row is marked COMPLETED and local_evidence.sync_status → 'SYNCED'.
 * 5. On failure the row is marked FAILED and attempt_count incremented.
 *    Rows with attempt_count >= 5 are not retried automatically.
 *
 * The mobile app is fully functional even if the server is unreachable —
 * the queue simply accumulates until connectivity is restored.
 */

import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getPendingQueueItems, markQueueItemStatus } from './index';
import { API_BASE_URL as API_BASE } from '../services/api';

const MAX_ATTEMPTS = 5;
let _isSyncing = false;

/** Push all pending mutations to the central API */
export async function flushSyncQueue(token?: string): Promise<void> {
  if (_isSyncing) return;   // prevent concurrent runs
  _isSyncing = true;

  try {
    const pending = await getPendingQueueItems();
    if (!pending.length) return;

    // Batch into one request
    const mutations = pending
      .filter(item => item.attempt_count < MAX_ATTEMPTS)
      .map(item => ({
        queueId:    item.queue_id,
        entityType: item.entity_type,
        entityId:   item.entity_id,
        actionType: item.action_type,
        payload:    JSON.parse(item.payload_json),
      }));

    if (!mutations.length) return;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/sync/push`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ mutations }),
    });

    if (!res.ok) {
      // Server returned an error — mark all as failed
      for (const m of mutations) {
        await markQueueItemStatus(m.queueId, 'FAILED', `HTTP ${res.status}`);
      }
      return;
    }

    const { results } = await res.json() as { results: Array<{ entityId: string; status: string; error?: string }> };

    // Map results back by entityId
    const resultMap = new Map(results.map(r => [r.entityId, r]));
    for (const m of mutations) {
      const r = resultMap.get(m.entityId);
      if (r?.status === 'ok') {
        await markQueueItemStatus(m.queueId, 'COMPLETED');
      } else {
        await markQueueItemStatus(m.queueId, 'FAILED', r?.error || 'Unknown error');
      }
    }
  } catch (err: any) {
    console.warn('[sync] flushSyncQueue error:', err.message);
  } finally {
    _isSyncing = false;
  }
}

/**
 * Register listeners that automatically trigger a sync when:
 * - The app returns to the foreground
 * - Network connectivity is restored
 *
 * Call this once from AppProvider's useEffect on mount.
 * Returns a cleanup function to remove all listeners.
 */
export function registerSyncListeners(getToken: () => string | null): () => void {
  // Foreground listener
  const appStateSubscription = AppState.addEventListener(
    'change',
    (state: AppStateStatus) => {
      if (state === 'active') {
        flushSyncQueue(getToken() ?? undefined);
      }
    }
  );

  // Network reconnection listener
  const unsubscribeNetInfo = NetInfo.addEventListener((netState) => {
    if (netState.isConnected && netState.isInternetReachable) {
      flushSyncQueue(getToken() ?? undefined);
    }
  });

  return () => {
    appStateSubscription.remove();
    unsubscribeNetInfo();
  };
}
