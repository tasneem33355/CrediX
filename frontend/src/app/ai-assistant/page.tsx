'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Paperclip,
  Clock,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  mockChatSessions,
  mockInitialChatMessages,
} from '@/data/mockData';
import { ChatMessage } from '@/types';

export default function AIAssistantPage() {
  const { t, language, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const [sessions, setSessions] = useState(mockChatSessions);
  const [activeSessionId, setActiveSessionId] = useState('sess_1');
  const [messages, setMessages] = useState<ChatMessage[]>(mockInitialChatMessages);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const q = textToSend || inputQuestion;
    if (!q.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: q,
      textEn: q,
      timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsTyping(true);

    // Simulate RAG Assistant response with cited document proof
    setTimeout(() => {
      let botResponse: ChatMessage;

      if (q.includes('متناقضات') || q.includes('discrepancies')) {
        botResponse = {
          id: `msg_bot_${Date.now()}`,
          sender: 'assistant',
          text: 'نعم، تم رصد تناقض بين شهادة الدخل (المعلن: 85,000 ج.م) وكشف الحساب البنكي الصادر من البنك الأهلي المصري (المتوسط الفعلي: 53,700 ج.م شهرياً).',
          textEn: 'Yes, a discrepancy was identified between the Income Certificate (declared: 85,000 EGP) and the National Bank of Egypt statement (actual average: 53,700 EGP/month).',
          timestamp: 'الآن',
          citations: [
            {
              documentName: 'كشف حساب بنكي - صفحة 3',
              documentNameEn: 'Bank Statement - Page 3',
              page: 3,
              quote: 'متوسط التدفق الشهري الدائن: 53,700 ج.م',
            },
            {
              documentName: 'شهادة الدخل',
              documentNameEn: 'Income Certificate',
              page: 1,
              quote: 'الدخل الصافي المعلن: 85,000 ج.م',
            },
          ],
          suggestedAction: {
            label: 'إجراء مقترح',
            labelEn: 'Suggested Action',
            description: 'طلب كشف حساب بنكي لـ 6 أشهر إضافية أو إقرار ضريبي موثق.',
            descriptionEn: 'Request an additional 6-month bank statement or certified tax return.',
          },
        };
      } else {
        botResponse = {
          id: `msg_bot_${Date.now()}`,
          sender: 'assistant',
          text: `بناءً على وثائق طلب ${activeSessionId === 'sess_1' ? 'أحمد فؤاد' : 'العميل'}، فإن درجة الجدارة الائتمانية تبلغ 54/100 (مخاطر متوسطة) ونسبة عبء الدين DBR تتوافق مع معايير البنك المركزي بنسبة 78%.`,
          textEn: `Based on the application documents, the creditworthiness score is 54/100 (Medium Risk) with a DBR rating of 78% complying with CBE guidelines.`,
          timestamp: 'الآن',
          citations: [
            {
              documentName: 'تقرير الاستعلام الائتماني i-Score',
              documentNameEn: 'i-Score Credit Report',
              page: 1,
              quote: 'الدرجة الائتمانية المسجلة: 54/100',
            },
          ],
        };
      }

      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <AppLayout breadcrumbTitle={t('nav.aiAssistant')} fullHeight>
      <div className="flex-1 flex flex-col min-h-0 h-full gap-3 sm:gap-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
              {t('ai.assistantTitle')}
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {t('ai.askAboutApp')}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8EEF5] border border-border text-brand-navy text-xs font-semibold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-semantic-success animate-pulse" />
            <span>{t('ai.onlineStatus')}</span>
          </div>
        </div>

        {/* Main AI Workspace: Collapsible Sessions + Chat */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 items-stretch">
          {/* Left Sessions Sidebar (Collapsible) */}
          {isHistoryOpen && (
            <Card className="w-full lg:w-64 xl:w-72 shrink-0 p-3.5 flex flex-col justify-between overflow-hidden transition-all duration-300 min-h-0 h-full">
              <div className="flex items-center justify-between px-1 pb-2.5 border-b border-border text-xs font-bold text-text-primary shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-navy" />
                  <span>{t('ai.chatHistory')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-brand-navy hover:bg-surface-subtle transition-colors cursor-pointer"
                  title={language === 'ar' ? 'إخفاء المحادثات' : 'Collapse conversations'}
                  aria-label={language === 'ar' ? 'إخفاء المحادثات' : 'Collapse conversations'}
                >
                  <PanelLeftClose className={clsx('w-4 h-4', direction === 'rtl' && 'scale-x-[-1]')} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 my-2 min-h-0 pr-1">
                {sessions.map((sess) => {
                  const isActive = activeSessionId === sess.id;
                  return (
                    <button
                      key={sess.id}
                      onClick={() => setActiveSessionId(sess.id)}
                      className={`w-full p-2.5 rounded-xl text-start transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#E8EEF5] border border-brand-navy/30 text-brand-navy font-semibold'
                          : 'hover:bg-surface-subtle text-text-secondary'
                      }`}
                    >
                      <p className="text-xs font-bold text-text-primary truncate">
                        {language === 'ar' ? sess.title : sess.titleEn}
                      </p>
                      <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{language === 'ar' ? sess.timeAgo : sess.timeAgoEn}</span>
                      </p>
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full shrink-0 mt-1"
                onClick={() => {
                  const newId = `sess_${Date.now()}`;
                  setSessions([
                    {
                      id: newId,
                      title: 'محادثة تحليل جديدة',
                      titleEn: 'New Analysis Chat',
                      timeAgo: 'الآن',
                      timeAgoEn: 'Just now',
                    },
                    ...sessions,
                  ]);
                  setActiveSessionId(newId);
                  setMessages([]);
                }}
              >
                + {language === 'ar' ? 'محادثة جديدة' : 'New Chat'}
              </Button>
            </Card>
          )}

          {/* Right Main Chat Window */}
          <Card className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0 h-full">
            {/* Chat Top Banner */}
            <div className="p-3 px-4 sm:px-6 border-b border-border flex items-center justify-between bg-surface-subtle/50 shrink-0">
              <div className="flex items-center gap-3">
                {/* Toggle Sidebar Button */}
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="p-1.5 sm:p-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-text-secondary hover:text-brand-navy transition-all cursor-pointer shadow-xs active:scale-95"
                  title={
                    isHistoryOpen
                      ? (language === 'ar' ? 'إخفاء المحادثات' : 'Collapse conversations')
                      : (language === 'ar' ? 'إظهار المحادثات' : 'Show conversations')
                  }
                  aria-label={
                    isHistoryOpen
                      ? (language === 'ar' ? 'إخفاء المحادثات' : 'Collapse conversations')
                      : (language === 'ar' ? 'إظهار المحادثات' : 'Show conversations')
                  }
                >
                  {isHistoryOpen ? (
                    <PanelLeftClose className={clsx('w-4 h-4', direction === 'rtl' && 'scale-x-[-1]')} />
                  ) : (
                    <PanelLeftOpen className={clsx('w-4 h-4', direction === 'rtl' && 'scale-x-[-1]')} />
                  )}
                </button>

                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#E8EEF5] text-brand-navy flex items-center justify-center">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-text-primary">{t('ai.assistantTitle')}</h3>
                  <p className="text-[11px] text-text-muted">{t('ai.assistantSubtitle')}</p>
                </div>
              </div>
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs min-h-0">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {!isUser ? (
                      <div className="w-8 h-8 rounded-xl bg-[#E8EEF5] text-brand-navy flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-navy text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5 shadow-xs">
                        م
                      </div>
                    )}

                    <div className={`space-y-2 max-w-xl ${isUser ? 'text-end' : 'text-start'}`}>
                      {/* Message Bubble */}
                      <div
                        className={`p-3.5 sm:p-4 rounded-2xl leading-relaxed ${
                          isUser
                            ? 'bg-brand-navy text-white shadow-xs'
                            : 'bg-surface-subtle text-text-primary border border-border'
                        }`}
                      >
                        <p>{language === 'ar' ? msg.text : msg.textEn || msg.text}</p>
                      </div>

                      {/* Document Citations Pills */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {msg.citations.map((c, i) => (
                            <div
                              key={i}
                              className="p-2.5 rounded-xl bg-surface border border-border text-[11px] space-y-1"
                            >
                              <div className="flex items-center gap-1.5 text-brand-navy font-semibold">
                                <FileText className="w-3.5 h-3.5" />
                                <span>{language === 'ar' ? c.documentName : c.documentNameEn}</span>
                              </div>
                              <p className="text-text-secondary italic">"{c.quote}"</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Suggested Action Card */}
                      {!isUser && msg.suggestedAction && (
                        <div className="p-3 rounded-xl bg-[#E8EEF5] border border-border text-[11px] text-start space-y-0.5">
                          <div className="flex items-center gap-1.5 text-brand-navy font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {language === 'ar'
                                ? msg.suggestedAction.label
                                : msg.suggestedAction.labelEn}
                            </span>
                          </div>
                          <p className="text-text-primary leading-relaxed">
                            {language === 'ar'
                              ? msg.suggestedAction.description
                              : msg.suggestedAction.descriptionEn}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E8EEF5] text-brand-navy flex items-center justify-center">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3 bg-surface-subtle rounded-2xl text-xs text-text-secondary">
                    {language === 'ar' ? 'جاري استرجاع البيانات وتحليل المستندات بالـ RAG...' : 'Retrieving data and analyzing documents via RAG...'}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Prompt Suggestion Chips & Input */}
            <div className="p-3 sm:p-4 border-t border-border space-y-2.5 bg-surface shrink-0">
              {/* Chips */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => handleSend(t('ai.prompt.contradictions'))}
                  className="px-3 py-1 rounded-full bg-surface-subtle hover:bg-surface-subtle/80 border border-border text-[11px] text-text-secondary hover:text-text-primary font-medium whitespace-nowrap transition-colors cursor-pointer"
                >
                  {t('ai.prompt.contradictions')}
                </button>
                <button
                  onClick={() => handleSend(t('ai.prompt.checkCredit'))}
                  className="px-3 py-1 rounded-full bg-surface-subtle hover:bg-surface-subtle/80 border border-border text-[11px] text-text-secondary hover:text-text-primary font-medium whitespace-nowrap transition-colors cursor-pointer"
                >
                  {t('ai.prompt.checkCredit')}
                </button>
                <button
                  onClick={() => handleSend(t('ai.prompt.cashFlow'))}
                  className="px-3 py-1 rounded-full bg-surface-subtle hover:bg-surface-subtle/80 border border-border text-[11px] text-text-secondary hover:text-text-primary font-medium whitespace-nowrap transition-colors cursor-pointer"
                >
                  {t('ai.prompt.cashFlow')}
                </button>
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={t('ai.inputPlaceholder')}
                  value={inputQuestion}
                  onChange={(e) => setInputQuestion(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface-subtle text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy"
                />
                <Button type="submit" variant="primary" size="sm" icon={<Arrow className="w-4 h-4" />}>
                  {t('action.send')}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
