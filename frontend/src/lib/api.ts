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

export async function fetchApplicationsList(params: {
  skip?: number;
  limit?: number;
  status?: string;
  loanType?: string;
  search?: string;
}, token?: string) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.set('skip', String(params.skip));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.loanType && params.loanType !== 'all') query.set('loanType', params.loanType);
  if (params.search) query.set('search', params.search);

  const res = await fetch(`${API_BASE}/applications?${query.toString()}`, {
    headers: getHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to load applications (Status ${res.status})`);
  }
  return res.json() as Promise<unknown[]>;
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

// ---------------------------------------------------------------------------
// Macro Portfolio Analytics Service (direct call: read-only, CORS enabled)
// No mock fallbacks: on any failure these return null and the page must show
// an error / empty state instead of invented numbers.
// ---------------------------------------------------------------------------

const PORTFOLIO_ANALYTICS_BASE = (
  process.env.NEXT_PUBLIC_PORTFOLIO_ANALYTICS_URL ||
  'https://portfolio-analytics-service-production.up.railway.app'
).replace(/\/$/, '');

async function getPortfolioData(path: string) {
  try {
    const res = await fetch(`${PORTFOLIO_ANALYTICS_BASE}/api/v1/portfolio/${path}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export function fetchPortfolioKpis() {
  return getPortfolioData('kpis');
}

export function fetchPortfolioConcentration() {
  return getPortfolioData('concentration');
}

export function fetchPortfolioScoredKpis() {
  return getPortfolioData('scored-kpis');
}

export function fetchPortfolioDrift() {
  return getPortfolioData('drift');
}

export async function runPortfolioStressTest(
  pdMultiplier = 2.0,
  lgdMultiplier = 1.3,
  portfolioExposure?: number
) {
  try {
    let exposure = portfolioExposure;
    if (exposure === undefined) {
      const kpis = await fetchPortfolioKpis();
      exposure = kpis?.total_portfolio_volume;
    }
    if (!exposure) return null;

    const res = await fetch(`${PORTFOLIO_ANALYTICS_BASE}/api/v1/portfolio/stress-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_name: 'Macro Stress Scenario',
        portfolio_exposure: exposure,
        baseline_pd: 0.045,
        pd_multiplier: pdMultiplier,
        lgd_multiplier: lgdMultiplier,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
