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

export async function createApplication(
  data: {
    applicantName: string;
    nationalId: string;
    mobileNumber: string;
    loanType: string;
    requestedAmount: number;
    tenureMonths: number;
    purpose?: string;
  },
  token?: string
) {
  const res = await fetch(`${API_BASE}/applications`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to submit application (${res.status})`);
  }
  return res.json();
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

// ---------------------------------------------------------------------------
// OCR ingestion & documents
// ---------------------------------------------------------------------------

export interface OcrWarning {
  code?: string;
  severity?: string;
  field?: string;
  message?: string;
  message_en?: string;
}

export interface OcrIngestResult {
  application_id: string;
  is_consistent: boolean;
  applicant_name: string;
  national_id: string;
  status: string;
  warnings: OcrWarning[];
  extraction_id: string;
}

export interface LoanOptions {
  loanType?: string;
  requestedAmount?: number;
  tenureMonths?: number;
  purpose?: string;
  mobileNumber?: string;
}

export interface OcrUploadFiles {
  nationalIdFront: File;
  nationalIdBack: File;
  salaryCertificate: File;
  bankStatement: File;
  iscore: File;
}

export interface ApiDocument {
  id: string;
  applicationId?: string | null;
  code: string;
  name: string;
  nameEn: string;
  size: string;
  uploadDate: string;
  status: string; // 'success' | 'processing' | 'failed'
  statusLabel: string;
  statusLabelEn: string;
  fileUrl?: string | null;
  uploadedAt?: string | null;
  extractedData?: {
    document_type?: string;
    overall_quality_score?: number | null;
    is_tampered_suspected?: boolean;
  } & Record<string, unknown>;
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  const err = await res.json().catch(() => ({}));
  return typeof err?.detail === 'string' ? err.detail : fallback;
}

/** Ingest an OCR JSON payload (e.g. response_Fixed.json) and create an application. */
export async function ingestOcrJson(
  ocrData: Record<string, unknown>,
  options: LoanOptions = {},
  token?: string
): Promise<OcrIngestResult> {
  const res = await fetch(`${API_BASE}/ocr/ingest-json`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      ocr_data: ocrData,
      loan_type: options.loanType,
      requested_amount: options.requestedAmount,
      tenure_months: options.tenureMonths,
      purpose: options.purpose,
      mobile_number: options.mobileNumber,
    }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, `Ingest failed (${res.status})`));
  }
  return res.json();
}

export interface GateIssue {
  document: string;
  document_label: string;
  document_label_en: string;
  field?: string | null;
  severity: string;
  code?: string;
  message?: string;
  message_en?: string;
  action: 'reupload' | 'acknowledge';
}

export interface GateResult {
  status: 'passed' | 'needs_acknowledgement' | 'needs_reupload' | 'blocked';
  can_proceed: boolean;
  requires_acknowledgement: boolean;
  is_tampered_suspected: boolean;
  issues: GateIssue[];
  reupload_documents: string[];
  ocr_data: Record<string, unknown>;
}

/** Run OCR + the validation gate on the 5 documents WITHOUT creating an application. */
export async function uploadAndCheckDocuments(
  files: OcrUploadFiles,
  token?: string
): Promise<GateResult> {
  const form = new FormData();
  form.append('national_id_front_file', files.nationalIdFront);
  form.append('national_id_back_file', files.nationalIdBack);
  form.append('salary_certificate_file', files.salaryCertificate);
  form.append('bank_statement_file', files.bankStatement);
  form.append('iscore_file', files.iscore);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/ocr/upload-and-check`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, `Document check failed (${res.status})`));
  }
  return res.json();
}

/** Upload the 5 credit documents, run OCR + validation and create an application. */
export async function uploadAndProcessDocuments(
  files: OcrUploadFiles,
  options: LoanOptions = {},
  token?: string
): Promise<OcrIngestResult> {
  const form = new FormData();
  form.append('national_id_front_file', files.nationalIdFront);
  form.append('national_id_back_file', files.nationalIdBack);
  form.append('salary_certificate_file', files.salaryCertificate);
  form.append('bank_statement_file', files.bankStatement);
  form.append('iscore_file', files.iscore);
  if (options.loanType) form.append('loan_type', options.loanType);
  if (options.requestedAmount !== undefined) form.append('requested_amount', String(options.requestedAmount));
  if (options.tenureMonths !== undefined) form.append('tenure_months', String(options.tenureMonths));
  if (options.purpose) form.append('purpose', options.purpose);
  if (options.mobileNumber) form.append('mobile_number', options.mobileNumber);
  
  // No Content-Type header here: the browser must set the multipart boundary itself.
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/ocr/upload-and-process`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, `Upload failed (${res.status})`));
  }
  return res.json();
}

export async function fetchDocuments(
  params: { applicationId?: string; skip?: number; limit?: number } = {},
  token?: string
): Promise<ApiDocument[]> {
  const query = new URLSearchParams();
  if (params.applicationId) query.set('applicationId', params.applicationId);
  if (params.skip !== undefined) query.set('skip', String(params.skip));
  if (params.limit !== undefined) query.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/documents?${query.toString()}`, {
    headers: getHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to load documents (Status ${res.status})`);
  }
  return res.json();
}
