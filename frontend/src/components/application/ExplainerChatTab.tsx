'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileText,
  User,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  fetchChatMessages,
  getOrCreateApplicationChatSession,
  sendChatMessage,
} from '@/lib/api';
import type { ChatMessage } from '@/types';

interface ExplainerChatTabProps {
  applicationId: string;
  applicantName?: string;
  recommendation?: string;
  creditScore?: number | null;
  fraudRiskScore?: number | null;
  reasons?: Array<{ ar: string; en: string }>;
}

export function ExplainerChatTab({
  applicationId,
  applicantName,
  recommendation,
  creditScore,
  fraudRiskScore,
  reasons = [],
}: ExplainerChatTabProps) {
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

  const quickQuestions = isAr
    ? [
        'ما هي أسباب هذا القرار الائتماني؟',
        'هل توجد أي مؤشرات تلاعب أو احتيال في المستندات؟',
        'ما هو تقييم عبء الدَّين (DTI) وقدرة السداد؟',
        'ما هي التوصية المقترحة لمسؤول الائتمان؟',
      ]
    : [
        'What are the key reasons for this credit decision?',
        'Are there any fraud or tampering indicators in the documents?',
        'What is the debt-to-income (DTI) and repayment assessment?',
        'What is the recommended action for the credit officer?',
      ];

  // Initialize chat session for this application
  useEffect(() => {
    if (!token || !applicationId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const chatSession = await getOrCreateApplicationChatSession(applicationId, token);
        const history = await fetchChatMessages(chatSession.id, token);
        if (cancelled) return;
        setSessionId(chatSession.id);
        setMessages(history);
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.message ||
              (isAr
                ? 'تعذّر الاتصال بمساعد تفسير القرار. يمكنك المحاولة مرة أخرى.'
                : 'Could not connect to model explainer assistant.')
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applicationId, token, isAr]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async (questionText?: string) => {
    const text = (questionText || input).trim();
    if (!text || !sessionId || isSending) return;

    if (!questionText) setInput('');
    setError(null);
    setIsSending(true);

    try {
      const [userMsg, botMsg] = await sendChatMessage(
        sessionId,
        { text, applicationId, lang: isAr ? 'ar' : 'en' },
        token
      );
      setMessages((prev) => [...prev, userMsg, botMsg]);
    } catch (err: any) {
      if (!questionText) setInput(text);
      setError(
        err?.message ||
          (isAr
            ? 'تعذّر توليد الرد من خوارزمية التفسير. يرجى المحاولة ثانية.'
            : 'Could not generate explanation. Please try again.')
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Decision Context & Key Insights (1 Col) */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Sparkles className="w-5 h-5 text-brand-navy" />
            <div className="text-start">
              <h3 className="text-sm font-bold text-text-primary">
                {isAr ? 'حيثيات ومبررات التقييم' : 'Evaluation Insights'}
              </h3>
              <p className="text-[11px] text-text-muted">
                {isAr ? `الطلب: ${applicationId}` : `Application: ${applicationId}`}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 text-start">
            <div className="p-3 bg-surface-subtle rounded-xl border border-border">
              <span className="text-[10px] text-text-muted block">
                {isAr ? 'درجة الائتمان (Score)' : 'Credit Score'}
              </span>
              <span className="text-sm font-extrabold text-brand-navy">
                {creditScore ?? '—'}
              </span>
            </div>
            <div className="p-3 bg-surface-subtle rounded-xl border border-border">
              <span className="text-[10px] text-text-muted block">
                {isAr ? 'مخاطر الاحتيال (Fraud)' : 'Fraud Score'}
              </span>
              <span
                className={`text-sm font-extrabold ${
                  (fraudRiskScore ?? 0) >= 50 ? 'text-semantic-error' : 'text-semantic-success'
                }`}
              >
                {fraudRiskScore !== null && fraudRiskScore !== undefined
                  ? `${fraudRiskScore}%`
                  : '—'}
              </span>
            </div>
          </div>

          {/* Summary Reasons from the Model */}
          <div className="space-y-2 text-start">
            <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-navy" />
              <span>{isAr ? 'أسباب وتفسيرات النموذج:' : 'Model Reasoning Statements:'}</span>
            </span>

            {reasons.length === 0 ? (
              <p className="text-xs text-text-muted p-3 bg-surface-subtle rounded-xl border border-border">
                {isAr
                  ? 'لم يتم تشغيل نموذج التقييم بعد أو لا توجد أسباب مسجلة.'
                  : 'Scoring has not run yet or no reasons recorded.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {reasons.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 bg-surface-subtle rounded-xl border border-border text-start space-y-1"
                  >
                    <p className="text-[11px] leading-relaxed text-text-secondary whitespace-pre-line">
                      {isAr ? r.ar : r.en}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Suggested Prompts */}
        <Card className="p-4 space-y-2.5 text-start">
          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-brand-navy" />
            <span>{isAr ? 'أسئلة مقترحة للاستفسار:' : 'Suggested Questions:'}</span>
          </span>
          <div className="flex flex-col gap-1.5">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => void handleSend(q)}
                disabled={!sessionId || isSending}
                className="text-start p-2 text-[11px] rounded-lg bg-surface-subtle hover:bg-brand-navy/10 hover:text-brand-navy border border-border/70 text-text-secondary transition-colors cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Right Column: Interactive Chat Interface (2 Cols) */}
      <div className="lg:col-span-2">
        <Card className="h-[620px] flex flex-col p-0 overflow-hidden">
          {/* Chat Header */}
          <div className="px-5 py-3.5 border-b border-border bg-surface-subtle flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-start">
              <div className="w-8 h-8 rounded-xl bg-brand-navy flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary">
                  {isAr ? 'مساعد تفسير نتائج الموديل واستفسارات الطلب' : 'Model Explainer & Application Copilot'}
                </h4>
                <p className="text-[10px] text-text-muted">
                  {isAr
                    ? 'يجيب بالاستناد المباشر إلى بيانات ومستندات هذا الطلب فقط'
                    : 'Grounded strictly in this specific application\'s documents & scores'}
                </p>
              </div>
            </div>
            <Badge variant="info" size="sm">
              {isAr ? 'متصل بالطلب' : 'Grounded'}
            </Badge>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center h-full gap-2 text-xs text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-brand-navy" />
                <span>{isAr ? 'جاري استدعاء سجل الاستفسارات...' : 'Loading conversation history...'}</span>
              </div>
            )}

            {!isLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-navy/10 flex items-center justify-center text-brand-navy">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h5 className="text-xs font-bold text-text-primary">
                    {isAr ? 'استفسر عن أي تفصيلة في هذا الملف' : 'Inquire about any detail in this file'}
                  </h5>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {isAr
                      ? `يمكنك التحدث بحرية وطرح أي سؤال لمسؤول الائتمان حول ${
                          applicantName || 'العميل'
                        }، كشف الحساب، أو أسباب درجة المخاطر.`
                      : 'Ask questions about this applicant, document verifications, income ratios, or scoring factors.'}
                  </p>
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isUser = m.sender === 'user';
              const body = !isAr && m.textEn ? m.textEn : m.text;

              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                      isUser
                        ? 'bg-brand-navy text-white'
                        : 'bg-surface-subtle border border-border text-brand-navy'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed text-start ${
                      isUser
                        ? 'bg-brand-navy text-white rounded-te-none'
                        : 'bg-surface border border-border text-text-primary rounded-ts-none shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line">{body}</p>
                    {m.timestamp && (
                      <span
                        className={`text-[9px] mt-1.5 block opacity-70 ${
                          isUser ? 'text-white/80' : 'text-text-muted'
                        }`}
                      >
                        {m.timestamp}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-surface-subtle border border-border flex items-center justify-center shrink-0 text-brand-navy">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 bg-surface border border-border rounded-2xl rounded-ts-none text-xs text-text-muted flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-navy" />
                  <span>{isAr ? 'جاري تحليل القرار وتوليد الإجابة...' : 'Analyzing decision and generating response...'}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-semantic-error-subtle border border-semantic-error/30 rounded-xl text-xs text-semantic-error text-start">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-border bg-surface">
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
                placeholder={
                  isAr
                    ? 'اكتب استفسارك عن هذا الملف الائتماني (اضغط Enter للإرسال)...'
                    : 'Ask about this credit application (Press Enter to send)...'
                }
                className="flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-brand-navy focus:ring-1 focus:ring-brand-navy focus:outline-none disabled:opacity-50"
              />
              <Button
                variant="primary"
                size="md"
                onClick={() => void handleSend()}
                disabled={!input.trim() || !sessionId || isSending}
                className="h-10 px-3 bg-brand-navy hover:bg-brand-navy-dark text-white rounded-xl"
              >
                <Send className="w-4 h-4 rtl:-scale-x-100" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
