export type Language = 'ar' | 'en';

export type UserRole = 'client' | 'officer';
export type OfficerTier = 'junior_officer' | 'senior_officer' | 'risk_manager' | 'cro';

export interface User {
  id: string;
  name: string;
  nameEn: string;
  email: string;
  role: UserRole;
  avatar?: string;
  title?: string;
  titleEn?: string;
  officerTier?: OfficerTier;
  approvalLimitEgp?: number;
  canOverridePolicy?: boolean;
}

export type LoanType = 'personal' | 'sme' | 'auto' | 'mortgage';
export type ApplicationStatus = 'under_review' | 'approved' | 'suspicious' | 'rejected';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ExtractedDataField {
  label: string;
  labelEn: string;
  value: string;
  confidence: number;
}

export interface BankStatementSummary {
  totalDeposits: number;
  monthlyAverage: number;
  totalTransactions: number;
  averageBalance: number;
  periodMonths: number;
}

export interface CreditScoreFactor {
  id: string;
  name: string;
  nameEn: string;
  percentage: number;
  rating: 'good' | 'medium' | 'weak';
  ratingLabel: string;
  ratingLabelEn: string;
}

export interface FraudSignal {
  id: string;
  title: string;
  titleEn: string;
  severity: 'low' | 'medium' | 'high';
  severityLabel: string;
  severityLabelEn: string;
  confidence: number;
  evidence: string;
  evidenceEn: string;
  relatedDocument: string;
  relatedDocumentEn: string;
  timestamp: string;
  recommendedAction: string;
  recommendedActionEn: string;
  declaredValue?: string;
  actualValue?: string;
}

export interface DocumentItem {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  size: string;
  uploadDate: string;
  status: 'success' | 'processing' | 'failed';
  statusLabel: string;
  statusLabelEn: string;
  fileUrl?: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  titleEn: string;
  timestamp: string;
  description: string;
  descriptionEn: string;
  status: 'completed' | 'current' | 'pending';
  iconType: 'receipt' | 'ocr' | 'score' | 'fraud' | 'review';
}

export interface PipelineStep {
  id: string;
  label: string;
  labelEn: string;
  status: 'completed' | 'current' | 'pending';
}

export interface LoanApplication {
  id: string;
  applicantName: string;
  applicantNameEn: string;
  nationalId: string;
  mobileNumber: string;
  clientType: 'current' | 'new';
  occupation: string;
  occupationEn: string;
  loanType: LoanType;
  loanTypeLabel: string;
  loanTypeLabelEn: string;
  requestedAmount: number;
  currency: string;
  date: string;
  lastUpdated: string;
  status: ApplicationStatus;
  declaredMonthlyIncome?: number;
  companyName?: string;
  
  // AI Assessment & Explainability
  aiRecommendation: 'approve' | 'manual_review' | 'reject';
  aiRecommendationLabel: string;
  aiRecommendationLabelEn: string;
  aiConfidence: number;
  recommendationReasons: { ar: string; en: string }[];
  
  // Pipeline
  pipelineCompletedSteps: number;
  pipelineTotalSteps: number;
  pipelineSteps: PipelineStep[];

  // Extracted Data (OCR)
  ocrAccuracy: number;
  extractedFromDocCount: number;
  extractedFields: ExtractedDataField[];
  bankSummary: BankStatementSummary;

  // Credit Assessment
  creditScore: number;
  creditRiskCategory: RiskLevel;
  creditRiskLabel: string;
  creditRiskLabelEn: string;
  calculatedFactorsCount: number;
  creditFactors: CreditScoreFactor[];

  // Fraud Detection
  fraudRiskScore: number;
  fraudRiskCategory: RiskLevel;
  fraudRiskLabel: string;
  fraudRiskLabelEn: string;
  analyzedSignalsCount: number;
  fraudSignals: FraudSignal[];

  // Documents & Audit
  documents: DocumentItem[];
  timeline: TimelineEvent[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  textEn?: string;
  timestamp: string;
  citations?: {
    documentName: string;
    documentNameEn: string;
    page: number;
    quote: string;
  }[];
  suggestedAction?: {
    label: string;
    labelEn: string;
    description: string;
    descriptionEn: string;
  };
  answerMode?: 'grounded' | 'general' | 'hybrid' | 'insufficient_evidence';
  provenance?: 'retrieved' | 'ai_generated' | 'mixed' | 'unavailable';
  disclaimer?: string | null;
  segments?: {
    text: string;
    sourceType: 'retrieved' | 'ai_generated';
    citationHandles: string[];
    supportStatus: 'supported' | 'inference' | 'unsupported';
  }[];
}

export interface ChatSession {
  id: string;
  title: string;
  titleEn: string;
  timeAgo: string;
  timeAgoEn: string;
  active?: boolean;
}

export interface CaseCard {
  id: string;
  applicationId: string;
  clientName: string;
  clientNameEn: string;
  initials: string;
  amount: number;
  currency: string;
  stageTag: string;
  stageTagEn: string;
  columnId: 'processing' | 'human_review' | 'completed';
}

