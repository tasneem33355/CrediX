import type { ChatMessage, ChatSession } from '@/types';

type ApiChatSession = {
  id: string;
  title: string;
  titleEn: string;
  timeAgo: string;
  timeAgoEn: string;
  active?: boolean;
};

type ApiChatMessage = {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  textEn?: string | null;
  timestamp: string;
  citations?: ChatMessage['citations'];
  suggestedAction?: ChatMessage['suggestedAction'];
  answerMode?: ChatMessage['answerMode'];
  provenance?: ChatMessage['provenance'];
  disclaimer?: string | null;
  segments?: ChatMessage['segments'];
};

function apiBaseUrl(): string {
  // If explicitly configured in environment, use it
  if (process.env.NEXT_PUBLIC_AI_ASSISTANT_API_URL) {
    return process.env.NEXT_PUBLIC_AI_ASSISTANT_API_URL.replace(/\/$/, '');
  }
  // Standalone RAG Assistant service on Railway
  return 'https://credix-ai-assistant-production.up.railway.app/api/v1';
}

async function request<T>(path: string, accessToken?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Chat API request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function toSession(session: ApiChatSession): ChatSession {
  return {
    id: session.id,
    title: session.title,
    titleEn: session.titleEn,
    timeAgo: session.timeAgo,
    timeAgoEn: session.timeAgoEn,
    active: session.active,
  };
}

function toMessage(message: ApiChatMessage): ChatMessage {
  return {
    id: message.id,
    sender: message.sender,
    text: message.text,
    textEn: message.textEn || message.text,
    timestamp: message.timestamp,
    citations: message.citations || [],
    suggestedAction: message.suggestedAction,
    answerMode: message.answerMode,
    provenance: message.provenance,
    disclaimer: message.disclaimer,
    segments: message.segments,
  };
}

export async function getChatSessions(accessToken?: string): Promise<ChatSession[]> {
  const sessions = await request<ApiChatSession[]>('/ai-assistant/sessions', accessToken);
  return sessions.map(toSession);
}

export async function createChatSession(title: string, accessToken?: string): Promise<ChatSession> {
  const session = await request<ApiChatSession>('/ai-assistant/sessions', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, titleEn: title }),
  });
  return toSession(session);
}

export async function getChatMessages(sessionId: string, accessToken?: string): Promise<ChatMessage[]> {
  const messages = await request<ApiChatMessage[]>(`/ai-assistant/sessions/${encodeURIComponent(sessionId)}/messages`, accessToken);
  return messages.map(toMessage);
}

export async function deleteChatSession(sessionId: string, accessToken?: string): Promise<void> {
  await request<void>(`/ai-assistant/sessions/${encodeURIComponent(sessionId)}`, accessToken, {
    method: 'DELETE',
  });
}

export async function postChatMessage(
  sessionId: string,
  text: string,
  accessToken?: string,
  mode: 'auto' | 'grounded' | 'general' = 'auto',
): Promise<ChatMessage[]> {
  const messages = await request<ApiChatMessage[]>(`/ai-assistant/sessions/${encodeURIComponent(sessionId)}/messages`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, textEn: text, mode }),
  });
  return messages.map(toMessage);
}
