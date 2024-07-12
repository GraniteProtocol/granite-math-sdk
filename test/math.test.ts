import { computeUtilizationRate, calculateDueInterest, compoundedInterest, convertAssetsToShares, convertSharesToAssets, calculateLpAPY, calculateBorrowAPY, secondsInAYear } from '../src/functions';
import { InterestRateParams } from '../src/types';

test('computeUtilizationRate', () => {
  expect(computeUtilizationRate(10,100)).toBe(0.1);
  expect(computeUtilizationRate(101,100)).toBe(1.01);
});

test('calculateDueInterest', () => {
  const irParams: InterestRateParams = {
    urKink: 0.7,
    baseIR: 0.5,
    slope1: 0.75,
    slope2: 1.5,
    avgBlocktime: 6,
  }
  expect(calculateDueInterest(
    1, 500, 500, irParams, 1000
  )).toBeCloseTo(1.0002853);
});

test('compoundedInterest', () => {
  const irParams: InterestRateParams = {
    urKink: 0.7,
    baseIR: 0.5,
    slope1: 0.75,
    slope2: 1.5,
    avgBlocktime: 6,
  }
  const interest = compoundedInterest(
    1, 500, 500, irParams, 1000
  )
  const principal = calculateDueInterest(
    1, 500, 500, irParams, 1000
  )
  expect(principal - interest).toBe(1);
});

test('convertAssetsToShares', () => {
  const irParams: InterestRateParams = {
    urKink: 0.7,
    baseIR: 0.5,
    slope1: 0.75,
    slope2: 1.5,
    avgBlocktime: 6,
  }

  expect(convertAssetsToShares(100, 8000, 10000, 0, 0, irParams, 0)).toBe(80);
  // LP share value increases
  expect(convertAssetsToShares(100, 8000, 10000, 1000, 0, irParams, 1000)).toBeLessThan(80);
  // LP assets should have increased in number
  expect(convertSharesToAssets(80, 8000, 10000, 1000, 0, irParams, 1000)).toBeGreaterThan(80);
});

describe('APY Calculations', () => {
  const irParams: InterestRateParams = {
    urKink: 0.8,
    baseIR: 0.02,
    slope1: 0.1,
    slope2: 0.2,
    avgBlocktime: 13
  };

  it('should return 0 for LP APY if utilization rate is 0', () => {
    const ur = 0;
    const protocolReservePercentage = 0.1;

    const result = calculateLpAPY(ur, irParams, protocolReservePercentage);
    expect(result).toBe(0);
  });

  it('should return base APY for Borrow APY if utilization rate is 0', () => {
    const ur = 0;
    const result = calculateBorrowAPY(ur, irParams);
    expect(result).toBeGreaterThan(irParams.baseIR);
  });
});
