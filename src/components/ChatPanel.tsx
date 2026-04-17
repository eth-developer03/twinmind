'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, ActionItem } from '@/types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isStreaming: boolean;
  actionItems: ActionItem[];
  onSummarize: () => void;
  hasTranscript: boolean;
}

export function ChatPanel({
  messages,
  onSendMessage,
  isStreaming,
  actionItems,
  onSummarize,
  hasTranscript,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'actions'>('chat');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Switch to chat tab when a new message arrives (e.g. summary)
  useEffect(() => {
    if (messages.length > 0) setActiveTab('chat');
  }, [messages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="panel panel--chat">
      <div className="panel-header">
        <div className="panel-tabs">
          <button
            className={`panel-tab ${activeTab === 'chat' ? 'panel-tab--active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            3. CHAT
          </button>
          <button
            className={`panel-tab ${activeTab === 'actions' ? 'panel-tab--active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            ACTION ITEMS
            {actionItems.length > 0 && (
              <span className="tab-badge">{actionItems.length}</span>
            )}
          </button>
        </div>
        <button
          className="summarize-btn"
          onClick={onSummarize}
          disabled={!hasTranscript || isStreaming}
          title="Generate meeting summary"
        >
          ∑ Summarize
        </button>
      </div>

      {activeTab === 'chat' && (
        <>
          <div className="chat-scroll">
            <div className="info-card">
              Click a suggestion for a detailed answer, or type a question below.
              Use <strong>∑ Summarize</strong> to get a full meeting summary.
            </div>

            {messages.length === 0 && (
              <p className="empty-state">Click a suggestion or type a question below.</p>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
                <div className="chat-role-label">
                  {msg.role === 'user' ? 'YOU' : 'ASSISTANT'}
                </div>
                <div className={`chat-bubble chat-bubble--${msg.role}`}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                  {msg.isStreaming && <span className="streaming-cursor">▋</span>}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              type="text"
              placeholder="Ask anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
            />
            <button
              className="send-button"
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
            >
              Send
            </button>
          </div>
        </>
      )}

      {activeTab === 'actions' && (
        <div className="action-items-scroll">
          {actionItems.length === 0 ? (
            <p className="empty-state">
              {hasTranscript
                ? 'No action items detected yet in the transcript.'
                : 'Action items appear here once recording starts.'}
            </p>
          ) : (
            <ul className="action-items-list">
              {actionItems.map((item) => (
                <li key={item.id} className="action-item">
                  <span className="action-item-check">☐</span>
                  <div className="action-item-body">
                    <span className="action-item-text">{item.text}</span>
                    <div className="action-item-meta">
                      {item.assignee && (
                        <span className="action-item-tag action-item-tag--who">
                          👤 {item.assignee}
                        </span>
                      )}
                      {item.deadline && (
                        <span className="action-item-tag action-item-tag--when">
                          🕐 {item.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
