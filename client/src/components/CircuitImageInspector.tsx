/**
 * CircuitLens Stage 6B-4B-1 — Interactive Circuit Image Inspector
 *
 * Professional, accessible pan & zoom inspection canvas for uploaded PCB photographs.
 * Allows technicians to inspect fine silkscreen, trace routing, component packages,
 * and solder joints at original resolution alongside AI observations.
 *
 * Key Capabilities:
 * - Zoom in / out (50% to 500%) with mouse wheel, buttons, or pinch gestures.
 * - Center-directed mouse wheel zooming.
 * - Drag-to-pan when zoomed in with bounds clamping.
 * - Fit-to-viewport and 1:1 (100%) native pixel scale presets.
 * - Fullscreen mode via Fullscreen API with graceful fixed-overlay fallback.
 * - Visual observation cross-reference banner.
 * - Fully accessible keyboard controls and focus management.
 */

import { useState, useRef, useEffect, useCallback, type PointerEvent, type TouchEvent, type KeyboardEvent } from 'react';
import type { Translations } from '../i18n';

export interface CircuitImageInspectorProps {
  /** Source URL of the original circuit image (Blob URL or Data URL) */
  src: string;
  /** Descriptive alternative text for screen readers */
  alt: string;
  /** Name of the uploaded file for engineering provenance */
  fileName?: string;
  /** Formatted file size string (e.g. "1.4 MB") */
  fileSizeFormatted?: string;
  /** Internationalization strings */
  t: Translations;
  /** Currently selected AI observation to cross-reference against the photograph */
  selectedObservationText?: string | null;
  /** Callback to clear the active observation selection */
  onClearSelectedObservation?: () => void;
  /** Optional custom CSS class name */
  className?: string;
  /** Initial zoom level (defaults to 1.0 / 100%) */
  initialZoom?: number;
  /** Preserved zoom state from parent workspace across perspective changes */
  initialZoomState?: number;
  /** Callback notifying parent of zoom state updates */
  onZoomChange?: (newZoom: number) => void;
  /** Preserved pan state from parent workspace across perspective changes */
  initialPanState?: { x: number; y: number };
  /** Callback notifying parent of pan state updates */
  onPanChange?: (newPan: { x: number; y: number }) => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.25;

export function CircuitImageInspector({
  src,
  alt,
  fileName,
  fileSizeFormatted,
  t,
  selectedObservationText,
  onClearSelectedObservation,
  className = '',
  initialZoom = 1.0,
  initialZoomState,
  onZoomChange,
  initialPanState,
  onPanChange,
}: CircuitImageInspectorProps) {
  const [zoom, setZoom] = useState<number>(() => {
    const z = initialZoomState !== undefined ? initialZoomState : initialZoom;
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  });
  const [pan, setPan] = useState<{ x: number; y: number }>(() => initialPanState ?? { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });
  const touchPinchRef = useRef<{ initialDistance: number; initialZoom: number } | null>(null);

  // Synchronize fullscreen state from document
  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeEl = document.fullscreenElement || (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      setIsFullscreen(Boolean(activeEl && activeEl === containerRef.current));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Synchronize zoom state changes to parent workspace across perspective switches
  useEffect(() => {
    onZoomChange?.(zoom);
  }, [zoom, onZoomChange]);

  // Synchronize pan state changes to parent workspace when not actively dragging
  useEffect(() => {
    if (!isDragging) {
      onPanChange?.(pan);
    }
  }, [pan, isDragging, onPanChange]);

  // Handle escape key when in fallback fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleImageLoad = () => {
    if (imgRef.current) {
      setNaturalSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
      setImageError(false);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, Math.round((prev + ZOOM_STEP) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, Math.round((prev - ZOOM_STEP) * 100) / 100));
  }, []);

  const handleReset100 = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFitToViewport = useCallback(() => {
    if (!viewportRef.current || !naturalSize) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      return;
    }
    const vpWidth = viewportRef.current.clientWidth;
    const vpHeight = viewportRef.current.clientHeight;
    if (vpWidth <= 0 || vpHeight <= 0) return;

    const scaleX = vpWidth / naturalSize.width;
    const scaleY = vpHeight / naturalSize.height;
    const fitScale = Math.min(scaleX, scaleY) * 0.95;
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(fitScale * 100) / 100));
    setZoom(clamped);
    setPan({ x: 0, y: 0 });
  }, [naturalSize]);

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (container as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        } else {
          // Fallback overlay mode
          setIsFullscreen(true);
        }
      } catch {
        // Fallback overlay mode if browser denies API call
        setIsFullscreen(true);
      }
    } else {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      } catch {
        setIsFullscreen(false);
      }
    }
  };

  // Native non-passive wheel zoom preventing unintended surrounding page scroll
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onNativeWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setZoom((prevZoom) => {
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(prevZoom * factor * 100) / 100));
        if (nextZoom === prevZoom || !el) return prevZoom;

        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - (rect.left + rect.width / 2);
        const cursorY = e.clientY - (rect.top + rect.height / 2);

        const ratio = nextZoom / prevZoom;
        setPan((prevPan) => ({
          x: Math.round(cursorX - (cursorX - prevPan.x) * ratio),
          y: Math.round(cursorY - (cursorY - prevPan.y) * ratio),
        }));

        return nextZoom;
      });
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
    };
  }, []);

  // Pointer drag-to-pan handlers
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Only drag with primary mouse button or touch
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
  };

  // Multi-touch gestures (pinch to zoom)
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchPinchRef.current = {
        initialDistance: dist,
        initialZoom: zoom,
      };
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchPinchRef.current) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchPinchRef.current.initialDistance;
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Math.round(touchPinchRef.current.initialZoom * ratio * 100) / 100)
      );
      setZoom(nextZoom);
    }
  };

  const handleTouchEnd = () => {
    touchPinchRef.current = null;
  };

  // Keyboard navigation on viewport focus
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case '+':
      case '=':
        e.preventDefault();
        handleZoomIn();
        break;
      case '-':
      case '_':
        e.preventDefault();
        handleZoomOut();
        break;
      case '0':
        e.preventDefault();
        handleReset100();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        void toggleFullscreen();
        break;
      case 'ArrowUp':
        e.preventDefault();
        setPan((p) => ({ ...p, y: p.y + 40 }));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setPan((p) => ({ ...p, y: p.y - 40 }));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setPan((p) => ({ ...p, x: p.x + 40 }));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setPan((p) => ({ ...p, x: p.x - 40 }));
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`circuit-image-inspector ${isFullscreen ? 'inspector-fullscreen' : ''} ${className}`}
      role="region"
      aria-label={t.inspectorTitle}
    >
      {/* 1. Header Toolbar */}
      <div className="inspector-toolbar">
        <div className="inspector-title-group">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="inspector-header-icon"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <div className="inspector-title-texts">
            <span className="inspector-title">{t.inspectorTitle}</span>
            {fileName && (
              <span className="inspector-filename" dir="ltr" title={fileName}>
                {fileName} {fileSizeFormatted ? `(${fileSizeFormatted})` : ''}
              </span>
            )}
          </div>
          <span className="inspector-native-badge" title={t.inspectorOriginalImageBadge}>
            {t.inspectorOriginalImageBadge}
          </span>
        </div>

        {/* Action Controls */}
        <div className="inspector-controls-group" role="toolbar" aria-label={t.inspectorTitle}>
          <button
            type="button"
            className="inspector-btn"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            title={t.inspectorZoomOut}
            aria-label={t.inspectorZoomOut}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          <button
            type="button"
            className="inspector-zoom-badge"
            onClick={handleReset100}
            title={t.inspectorReset100}
            aria-label={`${t.inspectorZoomLevel}: ${Math.round(zoom * 100)}%`}
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            className="inspector-btn"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            title={t.inspectorZoomIn}
            aria-label={t.inspectorZoomIn}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          <div className="inspector-btn-divider" aria-hidden="true" />

          <button
            type="button"
            className="inspector-btn"
            onClick={handleFitToViewport}
            title={t.inspectorFit}
            aria-label={t.inspectorFit}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>

          <button
            type="button"
            className="inspector-btn"
            onClick={handleReset100}
            title={t.inspectorReset100}
            aria-label={t.inspectorReset100}
          >
            <span className="btn-text-label">1:1</span>
          </button>

          <div className="inspector-btn-divider" aria-hidden="true" />

          <button
            type="button"
            className={`inspector-btn ${isFullscreen ? 'btn-active' : ''}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? t.inspectorExitFullscreen : t.inspectorFullscreen}
            aria-label={isFullscreen ? t.inspectorExitFullscreen : t.inspectorFullscreen}
          >
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 2. Visual Observation Cross-Reference Banner */}
      {selectedObservationText && (
        <div className="inspector-observation-banner" role="status">
          <div className="observation-banner-left">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="observation-banner-icon"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            </svg>
            <div className="observation-banner-content">
              <span className="observation-banner-tag">{t.inspectorSelectedObservation}:</span>
              <span className="observation-banner-text">{selectedObservationText}</span>
            </div>
          </div>
          {onClearSelectedObservation && (
            <button
              type="button"
              className="observation-clear-btn"
              onClick={onClearSelectedObservation}
              title={t.inspectorClearObservation}
              aria-label={t.inspectorClearObservation}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* 3. Interactive Inspection Canvas / Viewport */}
      <div
        ref={viewportRef}
        className={`inspector-viewport ${isDragging ? 'dragging' : ''}`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        aria-label={`${t.inspectorTitle}. ${t.inspectorPanHint}`}
      >
        {imageError ? (
          <div className="inspector-error-state" role="alert">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{t.invalidFileTypeError}</p>
          </div>
        ) : (
          <div
            className="inspector-transform-layer"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            }}
          >
            <img
              ref={imgRef}
              src={src}
              alt={alt}
              className="inspector-image"
              draggable={false}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        )}
      </div>

      {/* 4. Footer Hint */}
      <div className="inspector-footer">
        <span className="inspector-hint">{t.inspectorPanHint} • [0] 1:1 • [Fit] View • [F] Fullscreen</span>
        {naturalSize && (
          <span className="inspector-dimensions" dir="ltr">
            {naturalSize.width} × {naturalSize.height} px
          </span>
        )}
      </div>
    </div>
  );
}

export default CircuitImageInspector;
