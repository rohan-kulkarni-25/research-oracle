import Anthropic from '@anthropic-ai/sdk';
import { ANALYST_PROMPTS, AnalystType } from './analysts';
import { AnalystResult, ConsensusResult, combineEstimates } from './combiner';

interface AnalystResponse {
  estimate: number;
  reasoning: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

const MOCK_RESPONSES: Record<AnalystType, AnalystResponse> = {
  baseRate: {
    estimate: 0.35,
    reasoning: "Historical base rate analysis: Bitcoin has exceeded previous all-time highs within 18 months of halving events approximately 35% of the time when starting from similar price levels. The reference class of major crypto rallies suggests caution.",
    confidence: 'MEDIUM'
  },
  evidence: {
    estimate: 0.45,
    reasoning: "[Web Search Context] Current evidence is mixed: ETF inflows remain strong, institutional adoption continues, but macro uncertainty persists. Recent Fed signals suggest rates may stay higher for longer, which historically dampens risk assets. Note: In production, this analysis would incorporate real-time news and market data.",
    confidence: 'MEDIUM'
  },
  contrarian: {
    estimate: 0.55,
    reasoning: "Market may be underpricing the halving supply shock combined with ETF demand. Most analysts focus on macro headwinds but ignore that Bitcoin's correlation to traditional assets has decreased. Potential for rapid repricing if sentiment shifts.",
    confidence: 'LOW'
  }
};

export class ConsensusEngine {
  private client: Anthropic | null = null;
  private model = 'claude-sonnet-4-20250514';
  private initialized = false;

  private get mockMode(): boolean {
    return !process.env.ANTHROPIC_API_KEY;
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (!this.mockMode) {
      this.client = new Anthropic();
      console.log('[ConsensusEngine] Initialized with Anthropic API');
    } else {
      console.log('[ConsensusEngine] Running in MOCK mode - no API key configured');
    }
  }

  private async runAnalyst(
    type: AnalystType,
    question: string,
    context?: string
  ): Promise<AnalystResult> {
    if (this.mockMode) {
      const mock = MOCK_RESPONSES[type];
      return {
        type,
        estimate: mock.estimate,
        reasoning: `[MOCK] ${mock.reasoning}`,
        confidence: mock.confidence
      };
    }

    const prompt = ANALYST_PROMPTS[type](question, context);

    try {
      const response = await this.client!.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error(`Unexpected response type: ${content.type}`);
      }

      const parsed = this.parseAnalystResponse(content.text);

      return {
        type,
        estimate: parsed.estimate,
        reasoning: parsed.reasoning,
        confidence: parsed.confidence
      };
    } catch (error) {
      console.error(`Error running ${type} analyst:`, error);
      throw new Error(`${type} analyst failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseAnalystResponse(text: string): AnalystResponse {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in analyst response');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      if (typeof parsed.estimate !== 'number' || parsed.estimate < 0 || parsed.estimate > 1) {
        throw new Error(`Invalid estimate: ${parsed.estimate}`);
      }

      if (typeof parsed.reasoning !== 'string' || !parsed.reasoning) {
        throw new Error('Missing or invalid reasoning');
      }

      const confidence = (parsed.confidence || '').toUpperCase();
      if (!['HIGH', 'MEDIUM', 'LOW'].includes(confidence)) {
        throw new Error(`Invalid confidence: ${parsed.confidence}`);
      }

      return {
        estimate: parsed.estimate,
        reasoning: parsed.reasoning,
        confidence: confidence as 'HIGH' | 'MEDIUM' | 'LOW'
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse JSON: ${error.message}`);
      }
      throw error;
    }
  }

  async estimate(question: string, context?: string): Promise<ConsensusResult> {
    this.ensureInitialized();

    const analystTypes: AnalystType[] = ['baseRate', 'evidence', 'contrarian'];

    const results = await Promise.all(
      analystTypes.map(type => this.runAnalyst(type, question, context))
    );

    return combineEstimates(results);
  }
}
