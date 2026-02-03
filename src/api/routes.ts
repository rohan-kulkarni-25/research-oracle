import { Router, Request, Response } from 'express';
import { ConsensusEngine } from '../consensus/engine';
import * as stateManager from '../state/manager';
import * as calibration from '../state/calibration';
import { getSolanaClient } from '../solana/client';
import { v4 as uuid } from 'uuid';
import { EstimateRequest, EstimateResponse, RequestRecord } from '../types';

const router = Router();
const consensusEngine = new ConsensusEngine();

router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const body = req.body as EstimateRequest;

    if (!body.question || typeof body.question !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'question is required and must be a string' });
      return;
    }

    if (body.question.length < 10) {
      res.status(400).json({ error: 'Bad Request', message: 'question must be at least 10 characters' });
      return;
    }

    const requestId = uuid();
    const createdAt = new Date().toISOString();

    const estimate = await consensusEngine.estimate(body.question, body.context);

    const allRequests = await stateManager.getAllRequests();
    const calibrationStats = calibration.calculateCalibration(allRequests);

    let attestation: { txSignature: string; account: string } | undefined;

    if (body.attestOnChain !== false) {
      const solanaClient = getSolanaClient();
      if (solanaClient) {
        const deadline = body.deadline ? new Date(body.deadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        attestation = await solanaClient.attest(
          body.question,
          estimate.combined.estimate,
          estimate.combined.confidence,
          deadline
        );
      }
    }

    const record: RequestRecord = {
      requestId,
      question: body.question,
      context: body.context,
      category: body.category,
      deadline: body.deadline,
      estimate,
      attestation,
      createdAt
    };

    await stateManager.appendRequest(record);

    const response: EstimateResponse = {
      requestId,
      question: body.question,
      estimate,
      attestation,
      calibration: {
        brierScore: calibrationStats.brierScore,
        totalPredictions: calibrationStats.totalPredictions,
        totalResolved: calibrationStats.totalResolved
      },
      createdAt
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error processing estimate request:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to process estimate request' });
  }
});

router.get('/estimates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await stateManager.getRequest(id);

    if (!record) {
      res.status(404).json({ error: 'Not Found', message: 'Estimate not found' });
      return;
    }

    res.json(record);
  } catch (error) {
    console.error('Error fetching estimate:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch estimate' });
  }
});

router.post('/resolve', async (req: Request, res: Response) => {
  try {
    const { requestId, outcome } = req.body;

    if (!requestId || typeof requestId !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'requestId is required and must be a string' });
      return;
    }

    if (typeof outcome !== 'boolean') {
      res.status(400).json({ error: 'Bad Request', message: 'outcome is required and must be a boolean' });
      return;
    }

    const record = await stateManager.getRequest(requestId);

    if (!record) {
      res.status(404).json({ error: 'Not Found', message: 'Estimate not found' });
      return;
    }

    if (record.actualOutcome !== undefined) {
      res.status(409).json({ error: 'Conflict', message: 'Estimate has already been resolved' });
      return;
    }

    const probability = record.estimate.combined.estimate;
    const brierContribution = Math.pow(probability - (outcome ? 1 : 0), 2);

    await stateManager.updateRequest(requestId, {
      resolvedAt: new Date().toISOString(),
      actualOutcome: outcome,
      brierContribution
    });

    await calibration.updateCalibrationStats();

    res.json({
      requestId,
      outcome,
      brierContribution,
      message: 'Outcome recorded successfully'
    });
  } catch (error) {
    console.error('Error resolving estimate:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to resolve estimate' });
  }
});

router.get('/calibration', async (req: Request, res: Response) => {
  try {
    const allRequests = await stateManager.getAllRequests();
    const stats = calibration.calculateCalibration(allRequests);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching calibration:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch calibration stats' });
  }
});

export default router;
