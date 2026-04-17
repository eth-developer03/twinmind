'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [localKey, setLocalKey] = useState(settings.groqApiKey);
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState('');

  // Sync localKey each time modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalKey(settings.groqApiKey);
      setKeyError('');
      setShowKey(false);
    }
  }, [isOpen, settings.groqApiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = localKey.trim();
    if (trimmed && !trimmed.startsWith('gsk_')) {
      setKeyError('Groq API keys start with gsk_ — double check your key.');
      return;
    }
    setKeyError('');
    updateSettings({ groqApiKey: trimmed });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">⚙️ Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <h3 className="settings-section-title">Groq API Key</h3>
            <p className="settings-hint">
              Get your free key at{' '}
              <a href="https://console.groq.com" target="_blank" rel="noopener" className="settings-link">
                console.groq.com
              </a>{' '}— required to use the app.
            </p>
            <div className="key-input-row">
              <input
                className={`settings-input ${keyError ? 'settings-input--error' : ''}`}
                type={showKey ? 'text' : 'password'}
                placeholder="gsk_..."
                value={localKey}
                onChange={(e) => { setLocalKey(e.target.value); setKeyError(''); }}
              />
              <button className="toggle-key-btn" onClick={() => setShowKey((v) => !v)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            {keyError && <p className="settings-error">{keyError}</p>}
            {!localKey && (
              <p className="settings-warning">⚠️ No API key set — mic and suggestions won&apos;t work until you add one.</p>
            )}
          </div>

          {/* Auto-refresh interval */}
          <div className="settings-section">
            <h3 className="settings-section-title">Auto-refresh Interval (seconds)</h3>
            <input
              className="settings-input settings-input--small"
              type="number"
              min={10}
              max={120}
              value={settings.autoRefreshInterval}
              onChange={(e) => updateSettings({ autoRefreshInterval: Number(e.target.value) })}
            />
          </div>

          {/* Context windows */}
          <div className="settings-section settings-section--row">
            <div>
              <h3 className="settings-section-title">Suggestion Context Window</h3>
              <p className="settings-hint">Number of recent transcript chunks to use for suggestions</p>
              <input
                className="settings-input settings-input--small"
                type="number"
                min={1}
                max={20}
                value={settings.suggestionContextWindow}
                onChange={(e) => updateSettings({ suggestionContextWindow: Number(e.target.value) })}
              />
            </div>
            <div>
              <h3 className="settings-section-title">Detailed Answer Context Window</h3>
              <p className="settings-hint">Number of recent transcript chunks for chat answers</p>
              <input
                className="settings-input settings-input--small"
                type="number"
                min={1}
                max={50}
                value={settings.detailedAnswerContextWindow}
                onChange={(e) => updateSettings({ detailedAnswerContextWindow: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Suggestion prompt */}
          <div className="settings-section">
            <h3 className="settings-section-title">Live Suggestion Prompt</h3>
            <p className="settings-hint">
              Variables: <code>{'{transcript}'}</code>, <code>{'{previousSuggestions}'}</code>, <code>{'{meetingMode}'}</code>
            </p>
            <textarea
              className="settings-textarea"
              value={settings.suggestionPrompt}
              onChange={(e) => updateSettings({ suggestionPrompt: e.target.value })}
              rows={8}
            />
          </div>

          {/* Detailed answer prompt */}
          <div className="settings-section">
            <h3 className="settings-section-title">Detailed Answer Prompt (on click)</h3>
            <p className="settings-hint">
              Variables: <code>{'{transcript}'}</code>, <code>{'{suggestionType}'}</code>, <code>{'{suggestionPreview}'}</code>
            </p>
            <textarea
              className="settings-textarea"
              value={settings.detailedAnswerPrompt}
              onChange={(e) => updateSettings({ detailedAnswerPrompt: e.target.value })}
              rows={8}
            />
          </div>

          {/* Chat prompt */}
          <div className="settings-section">
            <h3 className="settings-section-title">Chat Prompt</h3>
            <p className="settings-hint">
              Variables: <code>{'{transcript}'}</code>
            </p>
            <textarea
              className="settings-textarea"
              value={settings.chatPrompt}
              onChange={(e) => updateSettings({ chatPrompt: e.target.value })}
              rows={6}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={resetSettings}>Reset to defaults</button>
          <button className="btn-primary" onClick={handleSave}>Save & Close</button>
        </div>
      </div>
    </div>
  );
}
