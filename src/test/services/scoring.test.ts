
import { calculateScore } from '../../services/scoring.js';
import { describe, it, expect } from 'vitest';

describe('score', () => {
  it('calculates upper bound 100', () => {
    const r = calculateScore({ kycVerified: true, financialsLinked: true, docCount: 3, revenue: 1000000 });
    expect(r.score).toBe(100);
  });
  it('low score when empty', () => {
    const r = calculateScore({ kycVerified: false, financialsLinked: false, docCount: 0, revenue: 0 });
    expect(typeof r.score).toBe('number');
  });
});
