export interface EstimateRequest {
  question: string;
  context?: string;
  deadline?: string;
  category?: 'politics' | 'crypto' | 'events' | 'sports' | 'other';
  attestOnChain?: boolean;
}

export interface AnalystEstimate {
  estimate: number;
  reasoning: string;
  confidence: string;
}

export interface ConsensusResult {
  estimates: {
    baseRate: AnalystEstimate;
    evidence: AnalystEstimate;
    contrarian: AnalystEstimate;
  };
  combined: {
    estimate: number;
    method: 'confidence_weighted';
    agreement: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  reasoning: string;
}

export interface EstimateResponse {
  requestId: string;
  question: string;
  estimate: ConsensusResult;
  attestation?: {
    txSignature: string;
    account: string;
  };
  calibration: {
    brierScore: number;
    totalPredictions: number;
    totalResolved: number;
  };
  createdAt: string;
}

export interface RequestRecord {
  requestId: string;
  question: string;
  context?: string;
  category?: string;
  deadline?: string;
  estimate: ConsensusResult;
  attestation?: {
    txSignature: string;
    account: string;
  };
  createdAt: string;
  resolvedAt?: string;
  actualOutcome?: boolean;
  brierContribution?: number;
}

export interface OracleState {
  totalRequests: number;
  totalResolved: number;
  cumulativeBrier: number;
  averageBrier: number;
  lastUpdated: string;
}

export interface CalibrationBucket {
  range: string;
  predicted: number;
  actual: number;
  count: number;
}

export interface CalibrationStats {
  brierScore: number;
  totalPredictions: number;
  totalResolved: number;
  buckets: CalibrationBucket[];
  lastUpdated: string;
}
