/**
 * CircuitLens Stage 6C-2D — Blob URL Lifecycle & Memory Tracker
 *
 * Tracks, manages, and cleans up object URLs generated from binary Blobs.
 * Prevents memory leaks by revoking obsolete URLs while ensuring active
 * components retain valid URLs until explicit replacement, case switch, or unmount.
 */

export interface BlobUrlTracker {
  create: (blob: Blob) => string;
  revokeCurrent: () => void;
  revokeIfActive: (url: string) => boolean;
  getCurrentUrl: () => string | null;
  revokeAll: () => void;
  getActiveCount: () => number;
}

/**
 * Creates an instance of BlobUrlTracker.
 * @param onRevoke Optional callback triggered when a URL is revoked (e.g. for testing)
 */
export function createBlobUrlTracker(onRevoke?: (url: string) => void): BlobUrlTracker {
  let currentUrl: string | null = null;
  const activeUrls = new Set<string>();

  const isBlobUrl = (url: string | null | undefined): url is string => {
    return typeof url === 'string' && url.startsWith('blob:');
  };

  const safeRevoke = (url: string) => {
    if (isBlobUrl(url)) {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore environment-specific revocation errors
        }
      }
      activeUrls.delete(url);
      onRevoke?.(url);
    }
  };

  return {
    create: (blob: Blob): string => {
      // Revoke any previous URL tracked by this instance before creating a new one
      if (currentUrl) {
        safeRevoke(currentUrl);
      }

      let newUrl: string;
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        newUrl = URL.createObjectURL(blob);
      } else {
        // Fallback for headless environments without full URL API
        newUrl = `blob:circuitlens_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      }

      currentUrl = newUrl;
      activeUrls.add(newUrl);
      return newUrl;
    },

    revokeCurrent: () => {
      if (currentUrl) {
        const urlToRevoke = currentUrl;
        currentUrl = null;
        safeRevoke(urlToRevoke);
      }
    },

    revokeIfActive: (url: string): boolean => {
      if (activeUrls.has(url)) {
        if (currentUrl === url) {
          currentUrl = null;
        }
        safeRevoke(url);
        return true;
      }
      return false;
    },

    getCurrentUrl: (): string | null => {
      return currentUrl;
    },

    revokeAll: () => {
      currentUrl = null;
      for (const url of Array.from(activeUrls)) {
        safeRevoke(url);
      }
      activeUrls.clear();
    },

    getActiveCount: (): number => {
      return activeUrls.size;
    },
  };
}
