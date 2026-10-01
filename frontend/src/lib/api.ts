/**
 * Central API Client for CrediX Underwriting, OCR, and Scoring.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');

function getHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchApplicationById(appId: string, token?: string) {
  const res = await fetch(`${API_BASE}/applications/${appId}`, {
    headers: getHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to load application ${appId} (Status ${res.status})`);
  }
  return res.json();
}

export async function runScoringPipeline(appId: string, token?: string) {
  const res = await fetch(`${API_BASE}/ocr/applications/${appId}/score`, {
    method: 'POST',
    headers: getHeaders(token),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Scoring failed with status ${res.status}`);
  }
  return res.json();
}

export async function submitOfficerDecision(
  appId: string,
  decision: 'approve' | 'reject' | 'manual',
  notes?: string,
  token?: string
) {
  const res = await fetch(`${API_BASE}/applications/${appId}/decision`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ decision, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 409) {
      throw new Error(err.detail || 'القرار نهائي بالفعل ولا يمكن تعديله (409 Conflict)');
    }
    throw new Error(err.detail || `Failed to submit decision (${res.status})`);
  }
  return res.json();
}

export async function fetchAuditTrail(appId: string, token?: string) {
  const res = await fetch(`${API_BASE}/applications/${appId}/audit`, {
    headers: getHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch audit trail (${res.status})`);
  }
  return res.json();
}

export async function fetchExtractions(appId: string, token?: string) {
  const res = await fetch(`${API_BASE}/ocr/applications/${appId}/extractions`, {
    headers: getHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch extractions (${res.status})`);
  }
  return res.json();
}
