import { CalibrationStats, CalibrationBucket, RequestRecord } from '../types';
import { getAllRequests, loadOracleState, saveOracleState } from './manager';

export function calculateBrierScore(probability: number, outcome: boolean): number {
  const actual = outcome ? 1 : 0;
  return Math.pow(probability - actual, 2);
}

export function calculateCalibration(requests: RequestRecord[]): CalibrationStats {
  const resolved = requests.filter(
    (r) => r.resolvedAt !== undefined && r.actualOutcome !== undefined
  );

  const bucketRanges = [
    { range: '0-10%', min: 0, max: 0.1 },
    { range: '10-20%', min: 0.1, max: 0.2 },
    { range: '20-30%', min: 0.2, max: 0.3 },
    { range: '30-40%', min: 0.3, max: 0.4 },
    { range: '40-50%', min: 0.4, max: 0.5 },
    { range: '50-60%', min: 0.5, max: 0.6 },
    { range: '60-70%', min: 0.6, max: 0.7 },
    { range: '70-80%', min: 0.7, max: 0.8 },
    { range: '80-90%', min: 0.8, max: 0.9 },
    { range: '90-100%', min: 0.9, max: 1.0 },
  ];

  const buckets: CalibrationBucket[] = bucketRanges.map(({ range, min, max }) => {
    const inBucket = resolved.filter((r) => {
      const prob = r.estimate.combined.estimate;
      return prob >= min && prob < max;
    });

    if (inBucket.length === 0) {
      return { range, predicted: 0, actual: 0, count: 0 };
    }

    const avgPredicted =
      inBucket.reduce((sum, r) => sum + r.estimate.combined.estimate, 0) / inBucket.length;
    const avgActual =
      inBucket.reduce((sum, r) => sum + (r.actualOutcome ? 1 : 0), 0) / inBucket.length;

    return {
      range,
      predicted: Math.round(avgPredicted * 1000) / 1000,
      actual: Math.round(avgActual * 1000) / 1000,
      count: inBucket.length,
    };
  });

  let brierScore = 0;
  if (resolved.length > 0) {
    const totalBrier = resolved.reduce((sum, r) => {
      return sum + calculateBrierScore(r.estimate.combined.estimate, r.actualOutcome!);
    }, 0);
    brierScore = Math.round((totalBrier / resolved.length) * 10000) / 10000;
  }

  return {
    brierScore,
    totalPredictions: requests.length,
    totalResolved: resolved.length,
    buckets: buckets.filter((b) => b.count > 0),
    lastUpdated: new Date().toISOString(),
  };
}

export async function updateCalibrationStats(): Promise<CalibrationStats> {
  const requests = await getAllRequests();
  const stats = calculateCalibration(requests);

  const state = await loadOracleState();
  state.cumulativeBrier = stats.brierScore * stats.totalResolved;
  state.averageBrier = stats.brierScore;
  state.totalResolved = stats.totalResolved;
  await saveOracleState(state);

  return stats;
}
