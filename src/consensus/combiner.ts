import { ConsensusResult } from '../types';

export interface AnalystResult {
  type: 'baseRate' | 'evidence' | 'contrarian';
  estimate: number;
  reasoning: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export type { ConsensusResult };

const CONFIDENCE_WEIGHTS: Record<string, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

function getAgreement(analysts: AnalystResult[]): { count: number; description: string } {
  const estimates = analysts.map(a => a.estimate);

  const within10Percent = (a: number, b: number) => Math.abs(a - b) <= 0.10;

  const baseEvidence = within10Percent(estimates[0], estimates[1]);
  const baseContrarian = within10Percent(estimates[0], estimates[2]);
  const evidenceContrarian = within10Percent(estimates[1], estimates[2]);

  if (baseEvidence && baseContrarian && evidenceContrarian) {
    return { count: 3, description: '3/3 agree within 10%' };
  }

  if (baseEvidence || baseContrarian || evidenceContrarian) {
    return { count: 2, description: '2/3 agree within 10%' };
  }

  const maxDiff = Math.max(
    Math.abs(estimates[0] - estimates[1]),
    Math.abs(estimates[0] - estimates[2]),
    Math.abs(estimates[1] - estimates[2])
  );

  if (maxDiff > 0.15) {
    return { count: 0, description: 'All 3 disagree by >15%' };
  }

  return { count: 1, description: 'Analysts disagree' };
}

function determineConfidence(agreement: { count: number; description: string }): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (agreement.count === 3) return 'HIGH';
  if (agreement.count === 2) return 'MEDIUM';
  return 'LOW';
}

function synthesizeReasoning(analysts: AnalystResult[]): string {
  const baseRate = analysts.find(a => a.type === 'baseRate')!;
  const evidence = analysts.find(a => a.type === 'evidence')!;
  const contrarian = analysts.find(a => a.type === 'contrarian')!;

  return `BASE RATE (${(baseRate.estimate * 100).toFixed(0)}%, ${baseRate.confidence}): ${baseRate.reasoning}

EVIDENCE (${(evidence.estimate * 100).toFixed(0)}%, ${evidence.confidence}): ${evidence.reasoning}

CONTRARIAN (${(contrarian.estimate * 100).toFixed(0)}%, ${contrarian.confidence}): ${contrarian.reasoning}`;
}

export function combineEstimates(analysts: AnalystResult[]): ConsensusResult {
  if (analysts.length !== 3) {
    throw new Error('Expected exactly 3 analyst results');
  }

  const baseRate = analysts.find(a => a.type === 'baseRate')!;
  const evidence = analysts.find(a => a.type === 'evidence')!;
  const contrarian = analysts.find(a => a.type === 'contrarian')!;

  if (!baseRate || !evidence || !contrarian) {
    throw new Error('Missing required analyst types');
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const analyst of analysts) {
    const weight = CONFIDENCE_WEIGHTS[analyst.confidence] || 2;
    weightedSum += analyst.estimate * weight;
    totalWeight += weight;
  }

  const combinedEstimate = weightedSum / totalWeight;
  const agreement = getAgreement(analysts);
  const confidence = determineConfidence(agreement);

  return {
    estimates: {
      baseRate: {
        estimate: baseRate.estimate,
        reasoning: baseRate.reasoning,
        confidence: baseRate.confidence
      },
      evidence: {
        estimate: evidence.estimate,
        reasoning: evidence.reasoning,
        confidence: evidence.confidence
      },
      contrarian: {
        estimate: contrarian.estimate,
        reasoning: contrarian.reasoning,
        confidence: contrarian.confidence
      }
    },
    combined: {
      estimate: Math.round(combinedEstimate * 1000) / 1000,
      method: 'confidence_weighted',
      agreement: agreement.description,
      confidence
    },
    reasoning: synthesizeReasoning(analysts)
  };
}
