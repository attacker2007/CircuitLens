/**
 * CircuitLens Stage 6C-2D — Native IndexedDB Investigation Persistence Engine
 *
 * Local-first storage engine using native browser IndexedDB with in-memory
 * fallback for test environments. Stores images natively as Blobs without base64 bloat.
 *
 * Stage 6C-2D Hardening:
 * - P0: Debounced save cancellation, per-ID association, flush-before-transition, and tombstone guards
 * - P1: Atomic in-transaction metadata updates (mutateInvestigation) eliminating read-modify-write races
 * - P2: Cached IndexedDB connection with versionchange, close, and error auto-reconnect handling
 */

import type {
  InvestigationRecord,
  InvestigationSummary,
  InvestigationStatus,
} from '../types/investigation.ts';
import type { AssistantMessage } from '../types/assistant.ts';
import { computeLegitimateStatus } from '../types/investigation.ts';

export const DB_NAME = 'circuitlens_db';
export const DB_VERSION = 1;
export const STORE_NAME = 'investigations';
export const LAST_ACTIVE_KEY = 'circuitlens_last_active_inv';

// In-memory fallback map for non-browser or simulated test environments
const memoryFallbackStore = new Map<string, InvestigationRecord>();

// Tombstoned investigation IDs to prevent late asynchronous writes from resurrecting deleted records
const tombstonedIds = new Set<string>();

// Per-investigation write serialization queues to guarantee sequential write execution
const writeQueues = new Map<string, Promise<unknown>>();

// Cached IndexedDB connection instance and open promise (P2 / SEC-04)
let cachedDb: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;

/** Check whether native IndexedDB is available in the current environment */
export function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

/**
 * Gets a healthy cached IndexedDB connection, deduplicating in-flight opens.
 * Closes automatically on versionchange to prevent blocking upgrades in other tabs.
 */
export function getDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }

  if (cachedDb) {
    return Promise.resolve(cachedDb);
  }

  if (dbOpenPromise) {
    return dbOpenPromise;
  }

  dbOpenPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      // Initial Schema v1
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('isArchived', 'isArchived', { unique: false });
        }
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      cachedDb = db;
      dbOpenPromise = null;

      // When another tab or process requests an upgrade, close immediately to avoid blocking
      db.onversionchange = () => {
        closeDatabase();
      };

      // Auto-recover on unexpected closure or error
      db.onclose = () => {
        if (cachedDb === db) cachedDb = null;
      };
      db.onerror = () => {
        if (cachedDb === db) cachedDb = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      dbOpenPromise = null;
      reject(request.error || new Error('Failed to open CircuitLens IndexedDB'));
    };

    request.onblocked = () => {
      console.warn('CircuitLens IndexedDB upgrade blocked by another open tab');
    };
  });

  return dbOpenPromise;
}

/** Closes the cached IndexedDB connection and resets cache pointers */
export function closeDatabase(): void {
  if (cachedDb) {
    try {
      cachedDb.close();
    } catch {
      // Ignore close errors
    }
    cachedDb = null;
  }
  dbOpenPromise = null;
}

/** Backwards-compatible alias for getDatabase */
export function openDatabase(): Promise<IDBDatabase> {
  return getDatabase();
}

/** Tombstone management */
export function markTombstoned(id: string): void {
  tombstonedIds.add(id);
}

export function isTombstoned(id: string): boolean {
  return tombstonedIds.has(id);
}

export function clearTombstone(id: string): void {
  tombstonedIds.delete(id);
}

/**
 * Creates a blank new investigation record ready for intake.
 */
export function createNewInvestigationRecord(boardName?: string): InvestigationRecord {
  const now = new Date().toISOString();
  const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const title = boardName?.trim() || 'Untitled Investigation';

  // Ensure new record is untombstoned
  clearTombstone(id);

  return {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    status: 'new',
    isArchived: false,
    imageBlob: null,
    imageMetadata: null,
    formData: {
      boardName: boardName || '',
      expectedBehavior: '',
      observedBehavior: '',
      relevantComponents: '',
      additionalNotes: '',
    },
    isStaged: false,
    diagnosis: null,
    evidenceLog: [],
    reassessments: [],
    reassessmentCycle: 0,
    activePerspective: 'overview',
    inspectorZoom: 1.0,
    inspectorPan: { x: 0, y: 0 },
    schemaVersion: '1.1.0',
    assistantMessages: [],
  };
}

/**
 * Internal core save execution without queue wrapping.
 */
async function executeSave(record: InvestigationRecord): Promise<InvestigationRecord> {
  if (isTombstoned(record.id)) {
    throw new Error(`Cannot save investigation ${record.id}: record has been deleted.`);
  }

  const updatedRecord: InvestigationRecord = {
    ...record,
    status: computeLegitimateStatus(
      record.status,
      record.diagnosis,
      record.evidenceLog,
      record.reassessments
    ),
    updatedAt: new Date().toISOString(),
  };

  if (!isIndexedDBAvailable()) {
    if (isTombstoned(updatedRecord.id)) {
      throw new Error(`Cannot save investigation ${updatedRecord.id}: record has been deleted.`);
    }
    memoryFallbackStore.set(updatedRecord.id, updatedRecord);
    setLastActiveId(updatedRecord.id);
    return updatedRecord;
  }

  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(updatedRecord);

      req.onsuccess = () => {
        if (isTombstoned(updatedRecord.id)) {
          // If deleted while writing, abort
          store.delete(updatedRecord.id);
          reject(new Error(`Investigation ${updatedRecord.id} was deleted during write.`));
          return;
        }
        setLastActiveId(updatedRecord.id);
        resolve(updatedRecord);
      };

      req.onerror = () => {
        if (req.error?.name === 'QuotaExceededError') {
          reject(new Error('Storage quota exceeded. Please export or delete older investigations to free space.'));
        } else {
          reject(req.error || new Error('Failed to save investigation record'));
        }
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Saves or updates an investigation record.
 * Automatically serializes concurrent writes per investigation ID to prevent races.
 */
export function saveInvestigation(record: InvestigationRecord): Promise<InvestigationRecord> {
  const currentQueue = writeQueues.get(record.id) || Promise.resolve();

  const queuedWrite = currentQueue
    .catch(() => {}) // Don't let previous failures block subsequent writes
    .then(() => executeSave(record));

  writeQueues.set(record.id, queuedWrite);
  return queuedWrite;
}

/**
 * Performs an atomic in-transaction mutation on an investigation record.
 * Solves SEC-02: prevents concurrent read-modify-write races by executing
 * the read and write in the exact same IndexedDB transaction.
 */
export async function mutateInvestigation(
  id: string,
  mutator: (record: InvestigationRecord) => void | InvestigationRecord
): Promise<InvestigationRecord> {
  if (isTombstoned(id)) {
    throw new Error(`Cannot mutate investigation ${id}: record has been deleted.`);
  }

  if (!isIndexedDBAvailable()) {
    const existing = memoryFallbackStore.get(id);
    if (!existing) {
      throw new Error(`Investigation ${id} not found`);
    }
    const mutated = mutator(existing) || existing;
    const updated: InvestigationRecord = {
      ...mutated,
      status: computeLegitimateStatus(
        mutated.status,
        mutated.diagnosis,
        mutated.evidenceLog,
        mutated.reassessments
      ),
      updatedAt: new Date().toISOString(),
    };
    memoryFallbackStore.set(id, updated);
    setLastActiveId(id);
    return updated;
  }

  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as InvestigationRecord | undefined;
        if (!existing) {
          reject(new Error(`Investigation ${id} not found`));
          return;
        }

        if (isTombstoned(id)) {
          reject(new Error(`Cannot mutate investigation ${id}: record has been deleted.`));
          return;
        }

        const mutated = mutator(existing) || existing;
        const updatedRecord: InvestigationRecord = {
          ...mutated,
          status: computeLegitimateStatus(
            mutated.status,
            mutated.diagnosis,
            mutated.evidenceLog,
            mutated.reassessments
          ),
          updatedAt: new Date().toISOString(),
        };

        const putReq = store.put(updatedRecord);
        putReq.onsuccess = () => {
          setLastActiveId(updatedRecord.id);
        };

        putReq.onerror = () => {
          reject(putReq.error || new Error(`Failed to update investigation ${id}`));
        };
      };

      getReq.onerror = () => {
        reject(getReq.error || new Error(`Failed to read investigation ${id} for mutation`));
      };

      tx.oncomplete = () => {
        // Retrieve and return the updated record on complete
        getInvestigation(id).then((rec) => {
          if (rec) resolve(rec);
          else reject(new Error(`Investigation ${id} could not be verified after mutation`));
        }).catch(reject);
      };

      tx.onerror = () => {
        reject(tx.error || new Error(`Transaction failed while mutating investigation ${id}`));
      };

      tx.onabort = () => {
        reject(new Error(`Transaction aborted while mutating investigation ${id}`));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves a single investigation record by ID.
 */
export async function getInvestigation(id: string): Promise<InvestigationRecord | null> {
  if (isTombstoned(id)) {
    return null;
  }

  if (!isIndexedDBAvailable()) {
    return memoryFallbackStore.get(id) || null;
  }

  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        resolve(req.result || null);
      };

      req.onerror = () => {
        reject(req.error || new Error(`Failed to load investigation ${id}`));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves all stored investigations ordered by most recently modified.
 */
export async function getAllInvestigations(): Promise<InvestigationRecord[]> {
  if (!isIndexedDBAvailable()) {
    return Array.from(memoryFallbackStore.values())
      .filter((rec) => !isTombstoned(rec.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records: InvestigationRecord[] = (req.result || []).filter(
          (rec: InvestigationRecord) => !isTombstoned(rec.id)
        );
        records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(records);
      };

      req.onerror = () => {
        reject(req.error || new Error('Failed to retrieve investigations'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves lightweight summaries for the dashboard grid/list.
 */
export async function getAllSummaries(): Promise<InvestigationSummary[]> {
  const records = await getAllInvestigations();
  return records.map((rec) => ({
    id: rec.id,
    title: rec.title || rec.formData.boardName || 'Untitled Investigation',
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
    status: rec.status,
    isArchived: !!rec.isArchived,
    boardName: rec.formData.boardName || 'Unspecified Board',
    hasImage: !!rec.imageBlob,
    hasDiagnosis: !!rec.diagnosis,
    evidenceCount: rec.evidenceLog ? rec.evidenceLog.length : 0,
    reassessmentCount: rec.reassessments ? rec.reassessments.length : 0,
    assistantMessageCount: rec.assistantMessages ? rec.assistantMessages.length : 0,
  }));
}

/**
 * Saves or updates a contextual assistant message atomically without overwriting
 * diagnostic or evidence state.
 */
export async function saveAssistantMessage(
  id: string,
  message: AssistantMessage
): Promise<InvestigationRecord> {
  return mutateInvestigation(id, (rec) => {
    const existing = rec.assistantMessages ? [...rec.assistantMessages] : [];
    const idx = existing.findIndex((m) => m.id === message.id);
    if (idx >= 0) {
      existing[idx] = message;
    } else {
      existing.push(message);
    }
    rec.assistantMessages = existing;
  });
}

/**
 * Clears all assistant conversation messages for an investigation atomically.
 */
export async function clearAssistantMessages(id: string): Promise<InvestigationRecord> {
  return mutateInvestigation(id, (rec) => {
    rec.assistantMessages = [];
  });
}

/**
 * Permanently deletes an investigation record.
 * Marks the ID as tombstoned to prevent any delayed in-flight save from resurrecting it.
 */
export async function deleteInvestigation(id: string): Promise<void> {
  markTombstoned(id);
  writeQueues.delete(id);

  if (!isIndexedDBAvailable()) {
    memoryFallbackStore.delete(id);
    if (getLastActiveId() === id) {
      setLastActiveId(null);
    }
    return;
  }

  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => {
        if (getLastActiveId() === id) {
          setLastActiveId(null);
        }
        resolve();
      };

      req.onerror = () => {
        reject(req.error || new Error(`Failed to delete investigation ${id}`));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Renames an investigation title atomically.
 */
export async function updateInvestigationTitle(id: string, newTitle: string): Promise<InvestigationRecord> {
  return mutateInvestigation(id, (rec) => {
    rec.title = newTitle.trim() || 'Untitled Investigation';
  });
}

/**
 * Updates status (e.g., technician marks as resolved or reopens) atomically.
 */
export async function updateInvestigationStatus(id: string, newStatus: InvestigationStatus): Promise<InvestigationRecord> {
  return mutateInvestigation(id, (rec) => {
    rec.status = newStatus;
  });
}

/**
 * Toggles the archive state of an investigation atomically.
 */
export async function setInvestigationArchived(id: string, isArchived: boolean): Promise<InvestigationRecord> {
  return mutateInvestigation(id, (rec) => {
    rec.isArchived = isArchived;
  });
}

let memoryLastActiveId: string | null = null;

/**
 * Gets the last-active investigation ID from session storage.
 */
export function getLastActiveId(): string | null {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      return window.sessionStorage.getItem(LAST_ACTIVE_KEY);
    } catch {
      return memoryLastActiveId;
    }
  }
  return memoryLastActiveId;
}

/**
 * Sets the last-active investigation ID in session storage.
 */
export function setLastActiveId(id: string | null): void {
  memoryLastActiveId = id;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      if (id) {
        window.sessionStorage.setItem(LAST_ACTIVE_KEY, id);
      } else {
        window.sessionStorage.removeItem(LAST_ACTIVE_KEY);
      }
    } catch {
      // ignore session storage errors
    }
  }
}

/**
 * Queries storage quota if supported by the browser.
 */
export async function checkStorageQuota(): Promise<{ usage: number; quota: number; percent: number } | null> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percent = quota > 0 ? Math.round((usage / quota) * 100) : 0;
      return { usage, quota, percent };
    } catch {
      return null;
    }
  }
  return null;
}

export interface DebouncedSaver {
  save: (
    record: InvestigationRecord,
    onSaved?: (saved: InvestigationRecord) => void,
    onError?: (err: unknown) => void
  ) => void;
  flush: (targetId?: string) => Promise<InvestigationRecord | null>;
  cancel: (targetId?: string) => void;
  hasPending: (targetId?: string) => boolean;
  getPendingRecord: (targetId?: string) => InvestigationRecord | null;
}

/**
 * Hardened Debounce Saver for auto-saving during rapid input.
 * Supports:
 * - Specific investigation ID association
 * - Synchronous cancellation on case deletion or switch
 * - Explicit flush awaiting persistence before transitions
 * - Preventing stale overwrites across investigations
 */
export function createDebouncedSaver(delayMs = 400): DebouncedSaver {
  interface PendingItem {
    record: InvestigationRecord;
    timer: ReturnType<typeof setTimeout> | null;
    onSavedCallbacks: Array<(saved: InvestigationRecord) => void>;
    onErrorCallbacks: Array<(err: unknown) => void>;
  }

  const pendingMap = new Map<string, PendingItem>();

  return {
    save: (
      record: InvestigationRecord,
      onSaved?: (saved: InvestigationRecord) => void,
      onError?: (err: unknown) => void
    ) => {
      // Disallow scheduling writes for tombstoned records
      if (isTombstoned(record.id)) {
        onError?.(new Error(`Cannot save deleted investigation ${record.id}`));
        return;
      }

      let item = pendingMap.get(record.id);
      if (item && item.timer) {
        clearTimeout(item.timer);
      }

      if (!item) {
        item = {
          record,
          timer: null,
          onSavedCallbacks: [],
          onErrorCallbacks: [],
        };
        pendingMap.set(record.id, item);
      } else {
        item.record = record;
      }

      if (onSaved) item.onSavedCallbacks.push(onSaved);
      if (onError) item.onErrorCallbacks.push(onError);

      item.timer = setTimeout(async () => {
        const current = pendingMap.get(record.id);
        if (!current) return;
        pendingMap.delete(record.id);

        if (isTombstoned(record.id)) {
          for (const cb of current.onErrorCallbacks) {
            cb(new Error(`Investigation ${record.id} was deleted before save executed.`));
          }
          return;
        }

        try {
          const res = await saveInvestigation(current.record);
          for (const cb of current.onSavedCallbacks) {
            cb(res);
          }
        } catch (err) {
          for (const cb of current.onErrorCallbacks) {
            cb(err);
          }
        }
      }, delayMs);
    },

    flush: async (targetId?: string): Promise<InvestigationRecord | null> => {
      if (targetId) {
        const item = pendingMap.get(targetId);
        if (!item) return null;
        if (item.timer) clearTimeout(item.timer);
        pendingMap.delete(targetId);

        if (isTombstoned(targetId)) {
          return null;
        }

        try {
          const res = await saveInvestigation(item.record);
          for (const cb of item.onSavedCallbacks) {
            cb(res);
          }
          return res;
        } catch (err) {
          for (const cb of item.onErrorCallbacks) {
            cb(err);
          }
          throw err;
        }
      }

      // Flush all pending records
      let lastSaved: InvestigationRecord | null = null;
      for (const [id, item] of Array.from(pendingMap.entries())) {
        if (item.timer) clearTimeout(item.timer);
        pendingMap.delete(id);

        if (!isTombstoned(id)) {
          try {
            const res = await saveInvestigation(item.record);
            for (const cb of item.onSavedCallbacks) {
              cb(res);
            }
            lastSaved = res;
          } catch (err) {
            for (const cb of item.onErrorCallbacks) {
              cb(err);
            }
          }
        }
      }
      return lastSaved;
    },

    cancel: (targetId?: string) => {
      if (targetId) {
        const item = pendingMap.get(targetId);
        if (item) {
          if (item.timer) clearTimeout(item.timer);
          pendingMap.delete(targetId);
        }
      } else {
        for (const item of pendingMap.values()) {
          if (item.timer) clearTimeout(item.timer);
        }
        pendingMap.clear();
      }
    },

    hasPending: (targetId?: string): boolean => {
      if (targetId) {
        return pendingMap.has(targetId);
      }
      return pendingMap.size > 0;
    },

    getPendingRecord: (targetId?: string): InvestigationRecord | null => {
      if (targetId) {
        return pendingMap.get(targetId)?.record || null;
      }
      const first = pendingMap.values().next();
      return first.done ? null : first.value.record;
    },
  };
}

/** Clear memory store and internal structures (used by tests) */
export function _resetMemoryStore(): void {
  memoryFallbackStore.clear();
  tombstonedIds.clear();
  writeQueues.clear();
  closeDatabase();
}
