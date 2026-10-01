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
// Portfolio analytics (computed by our backend from the database)
// On any failure these return null and the page shows an empty/error state.
// ---------------------------------------------------------------------------

export interface PortfolioKpis {
  total_loans_count: number;
  total_portfolio_volume: number;
  average_loan_size: number;
  npl_ratio: number;
  performing_loans_count: number;
  npl_loans_count: number;
  has_data: boolean;
  includes_demo_data: boolean;
}

export interface PortfolioConcentration {
  by_product: Record<string, number>;
  by_product_volume: Record<string, number>;
  by_status: Record<string, number>;
}

export interface PortfolioScoredKpis {
  has_data: boolean;
  total_decisions: number;
  by_decision: Record<string, number>;
  by_fraud_level: Record<string, number>;
  anomalies_count: number;
  avg_credit_score: number | null;
  avg_default_probability: number | null;
  avg_dti_ratio: number | null;
}

export interface PortfolioDrift {
  has_enough_data: boolean;
  system_health: 'HEALTHY' | 'MONITOR' | 'CRITICAL' | 'INSUFFICIENT_DATA';
  retraining_recommended: boolean;
  max_psi_feature: string | null;
  max_psi_score: number | null;
  features_psi: Record<string, number>;
  decisions_analyzed: number;
  min_decisions_required: number;
  cbe_audit_comment: string;
}

export interface StressTestResult {
  has_data: boolean;
  scenario_name: string;
  scenario_results: {
    portfolio_exposure: number;
    baseline_pd: number;
    baseline_ecl: number;
    stressed_pd: number;
    stressed_ecl: number;
    ecl_delta: number;
  } | null;
  sensitivity_curve: { rate_hike_bps: number; stressed_pd: number; stressed_ecl: number }[];
  assumptions?: { baseline_pd_source: string; base_lgd: number; pd_increase_per_100bps: number };
}

async function requestPortfolio<T>(path: string, token?: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/portfolio/${path}`, { ...init, headers: getHeaders(token) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function fetchPortfolioKpis(token?: string) {
  return requestPortfolio<PortfolioKpis>('kpis', token);
}

export function fetchPortfolioConcentration(token?: string) {
  return requestPortfolio<PortfolioConcentration>('concentration', token);
}

export function fetchPortfolioScoredKpis(token?: string) {
  return requestPortfolio<PortfolioScoredKpis>('scored-kpis', token);
}

export function fetchPortfolioDrift(token?: string) {
  return requestPortfolio<PortfolioDrift>('drift', token);
}

export function runPortfolioStressTest(pdMultiplier = 2.0, lgdMultiplier = 1.3, token?: string) {
  return requestPortfolio<StressTestResult>('stress-test', token, {
    method: 'POST',
    body: JSON.stringify({
      scenario_name: 'Macro Stress Scenario',
      pd_multiplier: pdMultiplier,
      lgd_multiplier: lgdMultiplier,
    }),
  });
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

export interface DashboardStatsData {
  totalApplications: number;
  totalGrowth: number;
  approvalRate: number;
  approvalGrowth: number;
  underReview: number;
  underReviewChange: number;
  suspiciousFraud: number;
  suspiciousAttentionCount: number;
}

export async function fetchDashboardStats(token?: string): Promise<DashboardStatsData | null> {
  const res = await fetch(`${API_BASE}/dashboard/stats`, { headers: getHeaders(token) });
  return res.ok ? res.json() : null;
}

export async function fetchDashboardTrends(token?: string): Promise<{ day: string; count: number }[]> {
  const res = await fetch(`${API_BASE}/dashboard/trends`, { headers: getHeaders(token) });
  return res.ok ? res.json() : [];
}
