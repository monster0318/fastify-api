
export interface ScoreParams {
  kycVerified: boolean;
  financialsLinked: boolean;
  docCount: number;
  revenue: number;
}

export interface ScoreResult {
  score: number;
  recommendations: string[];
}

export interface ScoreWeights {
  KYC: number;
  FINANCIALS: number;
  DOCS: number;
  REV_MAX: number;
  REV_MULT: number;
}


const WEIGHTS: ScoreWeights = {
  KYC: 30,
  FINANCIALS: 20,
  DOCS: 25,
  REV_MAX: 1_000_000,
  REV_MULT: 25,
} as const;

const MIN_DOCS = 3;

export function calculateScore(params: ScoreParams): ScoreResult {
  let totalScore = 0;
  const recommendations: string[] = [];


  if (params.kycVerified) {
    totalScore += WEIGHTS.KYC;
  } else {
    recommendations.push('Complete KYC verification');
  }


  if (params.financialsLinked) {
    totalScore += WEIGHTS.FINANCIALS;
  } else {
    recommendations.push('Link financial data');
  }


  if (params.docCount >= MIN_DOCS) {
    totalScore += WEIGHTS.DOCS;
  } else {
    const docsNeeded = MIN_DOCS - params.docCount;
    recommendations.push(
      `Upload ${docsNeeded} more document${docsNeeded > 1 ? 's' : ''}`
    );
  }


  const normRevenue = Math.min(params.revenue, WEIGHTS.REV_MAX);
  const revScore = Math.round(
    (normRevenue / WEIGHTS.REV_MAX) * WEIGHTS.REV_MULT
  );
  totalScore += revScore;
  if (params.revenue < WEIGHTS.REV_MAX) {
    recommendations.push(`Increase revenue up to ${WEIGHTS.REV_MAX}`);
  }

  return { 
    score: totalScore, 
    recommendations 
  };
}
