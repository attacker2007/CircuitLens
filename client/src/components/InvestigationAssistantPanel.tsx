/**
 * CircuitLens Stage 6C-3A — Contextual Investigation Assistant Discussion Panel
 *
 * Provides an integrated, investigation-scoped conversation interface where technicians
 * can discuss active hypotheses, test measurements, and next diagnostic steps.
 *
 * Supports:
 * - Enter to send, Shift+Enter for multiline
 * - Context-aware suggested technical questions
 * - Offline demonstration / preview provenance badges
 * - Clear investigation identity scoping
 * - Mobile-responsive layout (no horizontal overflow)
 * - English, Spanish, and Arabic RTL support
 */

import React, { useState, useRef, useEffect, useId } from 'react';
import type { Translations, SupportedLanguage } from '../i18n.ts';
import { isRtl } from '../i18n.ts';
import type {
  AssistantMessage,
  AssistantInvestigationContext,
  AssistantSuggestedAction,
} from '../types/assistant.ts';
import { submitAssistantMessage, AssistantClientError } from '../api/assistantClient.ts';
import { saveAssistantMessage, clearAssistantMessages } from '../storage/investigationStore.ts';
import { SafeMarkdown } from './SafeMarkdown.tsx';

export interface InvestigationAssistantPanelProps {
  investigationId: string;
  boardName: string;
  t: Translations;
  lang: SupportedLanguage;
  context: AssistantInvestigationContext;
  messages: AssistantMessage[];
  onMessagesChange: (messages: AssistantMessage[]) => void;
  isOpen: boolean;
  onClose: () => void;
  onExecuteSuggestedAction?: (action: AssistantSuggestedAction) => void;
}

export const InvestigationAssistantPanel: React.FC<InvestigationAssistantPanelProps> = ({
  investigationId,
  boardName,
  t,
  lang,
  context,
  messages,
  onMessagesChange,
  isOpen,
  onClose,
  onExecuteSuggestedAction,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [assistantMode, setAssistantMode] = useState<'offline' | 'live'>('offline');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<{
    message: string;
    unpersistedMessage: AssistantMessage;
  } | null>(null);

  // Resilient session messages state preserved during active investigation
  const [sessionMessages, setSessionMessages] = useState<AssistantMessage[]>(() => messages || []);
  const prevInvIdRef = useRef(investigationId);

  // Synchronize when incoming messages from props has new items or on investigation switch
  useEffect(() => {
    if (prevInvIdRef.current !== investigationId) {
      prevInvIdRef.current = investigationId;
      setSessionMessages(messages || []);
      return;
    }
    if (messages && messages.length > sessionMessages.length) {
      setSessionMessages(messages);
    }
  }, [investigationId, messages, sessionMessages.length]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const rtl = isRtl(lang);

  const panelHeadingId = useId();
  const inputLabelId = useId();

  // Scroll to bottom when new messages arrive or when opened
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessionMessages, isOpen, isSending]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Clean up in-flight request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : inputText;
    const trimmed = rawText.trim();
    if (!trimmed || isSending) return;

    setErrorNotice(null);
    setFailedMessage(null);
    setPersistenceError(null);

    const userMessageId = `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newUserMessage: AssistantMessage = {
      id: userMessageId,
      investigationId,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
      status: 'sent',
      isPersisted: false,
    };

    const nextMessages = [...sessionMessages, newUserMessage];
    setSessionMessages(nextMessages);
    onMessagesChange(nextMessages);
    setInputText('');
    setIsSending(true);

    // Save user message to IndexedDB and update persistence flag
    saveAssistantMessage(investigationId, newUserMessage)
      .then(() => {
        setSessionMessages((prev) =>
          prev.map((m) => (m.id === userMessageId ? { ...m, isPersisted: true } : m))
        );
      })
      .catch((err) => {
        console.warn('Deferred persistence for user message:', err);
      });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await submitAssistantMessage(
        {
          investigationId,
          message: trimmed,
          mode: assistantMode,
          context,
          conversationHistory: nextMessages.slice(-20).map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
        },
        controller.signal
      );

      if (response && response.message) {
        const asstMsg: AssistantMessage = {
          ...response.message,
          isPersisted: false,
        };
        const withAsst = [...nextMessages, asstMsg];
        setSessionMessages(withAsst);
        onMessagesChange(withAsst);

        saveAssistantMessage(investigationId, asstMsg)
          .then(() => {
            setSessionMessages((prev) =>
              prev.map((m) => (m.id === asstMsg.id ? { ...m, isPersisted: true } : m))
            );
          })
          .catch((err) => {
            console.warn('Deferred persistence for assistant reply:', err);
          });
      }
    } catch (err: unknown) {
      console.error('Assistant message failed:', err);
      const errMsg =
        err instanceof AssistantClientError
          ? err.message
          : 'Unable to communicate with assistant. Please try again.';
      setErrorNotice(errMsg);
      setFailedMessage(trimmed);
      setSessionMessages((prev) =>
        prev.map((m) => (m.id === userMessageId ? { ...m, status: 'error' } : m))
      );
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleSuggestedQuestionClick = (questionText: string) => {
    void handleSendMessage(questionText);
  };

  const handleRetry = () => {
    if (failedMessage) {
      void handleSendMessage(failedMessage);
    }
  };

  const handleRetrySave = async () => {
    if (!persistenceError) return;
    const msgToSave = persistenceError.unpersistedMessage;
    try {
      await saveAssistantMessage(investigationId, msgToSave);
      onMessagesChange(
        messages.map((m) => (m.id === msgToSave.id ? { ...m, isPersisted: true } : m))
      );
      setPersistenceError(null);
    } catch (err) {
      console.error('Retry save failed:', err);
    }
  };

  const handleClearHistory = () => {
    setSessionMessages([]);
    onMessagesChange([]);
    void clearAssistantMessages(investigationId).catch(console.error);
    setErrorNotice(null);
    setFailedMessage(null);
    setPersistenceError(null);
  };

  if (!isOpen) return null;

  return (
    <aside
      className={`investigation-assistant-drawer ${rtl ? 'rtl' : ''}`}
      aria-labelledby={panelHeadingId}
      role="complementary"
    >
      {/* Assistant Header */}
      <div className="assistant-header">
        <div className="assistant-header-titles">
          <div className="assistant-title-row">
            <svg
              className="assistant-spark-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
            </svg>
            <h3 id={panelHeadingId} className="assistant-panel-title">
              {t.assistantPanelTitle}
            </h3>
            <div className="assistant-mode-toggle" role="group" aria-label="Inference Mode">
              <button
                type="button"
                className={`assistant-mode-toggle-btn ${assistantMode === 'offline' ? 'active' : ''}`}
                onClick={() => setAssistantMode('offline')}
                title={t.assistantModeOfflineNotice || 'Local deterministic preview'}
              >
                <span>⚙️</span> {t.assistantModeOffline || 'Offline Preview'}
              </button>
              <button
                type="button"
                className={`assistant-mode-toggle-btn ${assistantMode === 'live' ? 'active live' : ''}`}
                onClick={() => setAssistantMode('live')}
                title={t.assistantModeLiveNotice || 'Live model API inference'}
              >
                <span>🟢</span> {t.assistantModeLive || 'Live AI'}
              </button>
            </div>
          </div>

          <div className="assistant-case-pill-row">
            <span className="assistant-case-label">{t.assistantActiveCaseLabel}:</span>
            <span className="assistant-case-name" title={boardName}>
              {boardName}
            </span>
            {sessionMessages.length > 0 && (
              <span className="assistant-msg-count">
                ({sessionMessages.length} {t.assistantMessagesCount})
              </span>
            )}
          </div>
        </div>

        <div className="assistant-header-actions">
          {sessionMessages.length > 0 && (
            <button
              type="button"
              className="assistant-clear-btn"
              onClick={handleClearHistory}
              title={t.assistantClearHistory}
              aria-label={t.assistantClearHistory}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}

          <button
            type="button"
            className="assistant-close-btn"
            onClick={onClose}
            title={t.assistantCloseBtn}
            aria-label={t.assistantCloseBtn}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Suggested Technical Questions Carousel / Chips */}
      <div className="assistant-suggested-section" aria-label={t.assistantSuggestedHeading}>
        <div className="assistant-suggested-title">{t.assistantSuggestedHeading}:</div>
        <div className="assistant-chips-scroll">
          <button
            type="button"
            className="assistant-chip-btn"
            onClick={() => handleSuggestedQuestionClick(t.assistantSuggestLeading)}
            disabled={isSending}
          >
            {t.assistantSuggestLeading}
          </button>
          <button
            type="button"
            className="assistant-chip-btn"
            onClick={() => handleSuggestedQuestionClick(t.assistantSuggestUnconfirmed)}
            disabled={isSending}
          >
            {t.assistantSuggestUnconfirmed}
          </button>
          <button
            type="button"
            className="assistant-chip-btn"
            onClick={() => handleSuggestedQuestionClick(t.assistantSuggestLatestMeasure)}
            disabled={isSending}
          >
            {t.assistantSuggestLatestMeasure}
          </button>
          <button
            type="button"
            className="assistant-chip-btn"
            onClick={() => handleSuggestedQuestionClick(t.assistantSuggestNext)}
            disabled={isSending}
          >
            {t.assistantSuggestNext}
          </button>
          <button
            type="button"
            className="assistant-chip-btn"
            onClick={() => handleSuggestedQuestionClick(t.assistantSuggestDistinguish)}
            disabled={isSending}
          >
            {t.assistantSuggestDistinguish}
          </button>
          <button
            type="button"
            className="assistant-chip-btn"
            onClick={() => handleSuggestedQuestionClick(t.assistantSuggestEvolution)}
            disabled={isSending}
          >
            {t.assistantSuggestEvolution}
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="assistant-messages-container" role="log" aria-live="polite">
        {sessionMessages.length === 0 ? (
          <div className="assistant-empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="assistant-empty-text">{t.assistantEmptyHistory}</p>
          </div>
        ) : (
          sessionMessages.map((msg) => (
            <div
              key={msg.id}
              className={`assistant-message-row ${msg.role === 'user' ? 'user-message' : 'assistant-message'} ${msg.status === 'error' ? 'message-error-row' : ''}`}
            >
              <div className="message-bubble">
                <div className="message-meta-line">
                  <span className="message-sender-label">
                    {msg.role === 'user' ? 'Technician' : 'CircuitLens Assistant'}
                  </span>
                  {msg.provenance === 'live_provider' ? (
                    <span className="message-live-pill" title={t.assistantLiveNotice}>
                      🟢 {t.assistantLiveBadge}
                    </span>
                  ) : (msg.isOfflinePreview || msg.provenance === 'offline_preview') && msg.role === 'assistant' ? (
                    <span className="message-offline-pill" title={t.assistantOfflineNotice}>
                      {t.assistantOfflineBadge}
                    </span>
                  ) : null}
                  {msg.status === 'error' && (
                    <span className="message-unsaved-pill status-error-pill" title="Inquiry not delivered to assistant">
                      ⚠️ Delivery failed
                    </span>
                  )}
                  {msg.isPersisted === false && msg.status !== 'error' && (
                    <span className="message-unsaved-pill" title={t.assistantPersistenceError}>
                      ⚠️ {t.assistantUnsavedPill}
                    </span>
                  )}
                  <span className="message-timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="message-content-text">
                  <SafeMarkdown content={msg.content} />
                </div>

                {/* Structured Action Proposals */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="message-suggested-actions">
                    {msg.suggestedActions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        className="msg-action-pill-btn"
                        onClick={() => onExecuteSuggestedAction?.(action)}
                      >
                        <span className="action-pill-icon">🔍</span>
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Pending Analysis Indicator */}
        {isSending && (
          <div className="assistant-message-row assistant-message pending-row">
            <div className="message-bubble pending-bubble">
              <span className="typing-dots" aria-hidden="true">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
              <span className="pending-text">{t.assistantSending}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Notice Banner */}
      {errorNotice && (
        <div className="assistant-error-banner" role="alert">
          <span className="error-text">{errorNotice}</span>
          {failedMessage && (
            <button
              type="button"
              className="assistant-retry-btn"
              onClick={handleRetry}
              disabled={isSending}
            >
              {t.assistantRetryBtn}
            </button>
          )}
        </div>
      )}

      {/* Persistence Error Notice Banner (Stage 6C-3A-B) */}
      {persistenceError && (
        <div className="assistant-persistence-banner" role="alert">
          <div className="persistence-banner-content">
            <span className="persistence-warning-icon" aria-hidden="true">⚠️</span>
            <span className="persistence-error-text">{persistenceError.message}</span>
          </div>
          <button
            type="button"
            className="assistant-retry-save-btn"
            onClick={handleRetrySave}
          >
            {t.assistantRetrySaveBtn}
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="assistant-input-area">
        <label id={inputLabelId} htmlFor="assistant-question-input" className="visually-hidden">
          {t.assistantInputPlaceholder}
        </label>
        <div className="assistant-input-row">
          <textarea
            id="assistant-question-input"
            ref={textareaRef}
            className="assistant-textarea"
            placeholder={t.assistantInputPlaceholder}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={isSending}
            aria-labelledby={inputLabelId}
            dir={rtl ? 'rtl' : 'ltr'}
          />
          <button
            type="button"
            className="assistant-send-btn action-btn primary-btn"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isSending}
            title={t.assistantSendBtn}
            aria-label={t.assistantSendBtn}
          >
            {isSending ? (
              <span className="spinner-icon-sm" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
            <span className="visually-hidden">{t.assistantSendBtn}</span>
          </button>
        </div>
        <div className="assistant-input-footer">
          <span className="assistant-keyboard-hint">{t.assistantKeyboardHint}</span>
        </div>
      </div>
    </aside>
  );
};
