import { PublicKey } from '@solana/web3.js';

export interface OracleStateAccount {
  authority: PublicKey;
  totalAttestations: bigint;
  totalResolved: bigint;
  cumulativeBrier: bigint;
  bump: number;
}

export interface AttestationAccount {
  oracle: PublicKey;
  questionHash: Uint8Array;
  estimate: number;
  confidence: number;
  deadline: bigint;
  createdAt: bigint;
  resolved: boolean;
  outcome: boolean;
  bump: number;
}

export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';

export function confidenceToNumber(confidence: Confidence): number {
  switch (confidence) {
    case 'LOW': return 0;
    case 'MEDIUM': return 1;
    case 'HIGH': return 2;
  }
}

export function numberToConfidence(num: number): Confidence {
  switch (num) {
    case 0: return 'LOW';
    case 1: return 'MEDIUM';
    case 2: return 'HIGH';
    default: return 'LOW';
  }
}
