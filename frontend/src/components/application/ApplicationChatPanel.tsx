'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import {
  fetchChatMessages,
  getOrCreateApplicationChatSession,
  sendChatMessage,
} from '@/lib/api';
import type { ChatMessage } from '@/types';

interface ApplicationChatPanelProps {
  applicationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicationChatPanel({ applicationId, isOpen, onClose }: ApplicationChatPanelProps) {
  const { language } = useLanguage();
  const { session } = useAuth();
  const token = session?.access_token;
  const isAr = language === 'ar';

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load (or create) this application's chat thread the first time the panel opens.
  useEffect(() => {
    if (!isOpen || !token || !applicationId) return;
    let cancelled = false;
    setSessionId(null);
    setMessages([]);
    setError(null);
    setIsLoading(true);
    (async () => {
      try {
        const chatSession = await getOrCreateApplicationChatSession(applicationId, token);
        const history = await fetchChatMessages(chatSession.id, token);
        if (cancelled) return;
        setSessionId(chatSession.id);
        setMessages(history);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || (isAr ? 'تعذّر فتح المحادثة.' : 'Could not open the chat.'));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, applicationId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !sessionId || isSending) return;
    setInput('');
    setError(null);
    setIsSending(true);
    try {
      const [userMsg, botMsg] = await sendChatMessage(
        sessionId,
        { text, applicationId, lang: language === 'ar' ? 'ar' : 'en' },
        token
      );
      setMessages((prev) => [...prev, userMsg, botMsg]);
    } catch (err: any) {
      setInput(text);
      setError(
        err?.message ||
          (isAr ? 'تعذّر الحصول على رد. حاولي مرة أخرى.' : 'Could not get a reply. Please try again.')
      );
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col border-s border-border bg-white shadow-xl"
        aria-label={isAr ? 'مساعد الطلب' : 'Application assistant'}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-start">
            <Bot className="h-5 w-5 text-brand-navy" />
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                {isAr ? 'مساعد الطلب' : 'Application Assistant'}
              </h3>
              <p className="text-[11px] text-text-muted">
                {isAr
                  ? `يجيب من بيانات الطلب ${applicationId} فقط`
                  : `Answers only from application ${applicationId} data`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-text-primary cursor-pointer"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isAr ? 'جاري تحميل المحادثة...' : 'Loading conversation...'}
            </div>
          )}

          {!isLoading && messages.length === 0 && !error && (
            <p className="text-xs leading-relaxed text-text-muted text-start">
              {isAr
                ? 'اسألي عن نتيجة الاحتيال أو الإشارات أو أي تفصيلة في هذا الطلب، وهجاوب من بياناته فقط.'
                : 'Ask about the fraud result, signals, or any detail of this application. Answers come from its data only.'}
            </p>
          )}

          {messages.map((m) => {
            const isUser = m.sender === 'user';
            const body = !isAr && m.textEn ? m.textEn : m.text;
            return (
              <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed text-start ${
                    isUser
                      ? 'bg-brand-navy text-white'
                      : 'border border-border bg-surface-subtle text-text-primary'
                  }`}
                >
                  {body}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isAr ? 'جاري التفكير...' : 'Thinking...'}
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-semantic-error/40 bg-semantic-error-subtle/30 px-3 py-2 text-xs text-semantic-error text-start">
              {error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={2}
              disabled={!sessionId || isSending}
              placeholder={isAr ? 'اكتبي سؤالك عن هذا الطلب...' : 'Ask about this application...'}
              className="flex-1 resize-none rounded-xl border border-border px-3 py-2 text-xs text-text-primary focus:border-brand-navy focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || !sessionId || isSending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50 cursor-pointer"
              aria-label={isAr ? 'إرسال' : 'Send'}
            >
              <Send className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
