import {
  annualizedStakerAPR,
  calculateStakersAPY,
  computeStakingRate,
  correctedLpAPY,
} from "../../src/modules/safetyModule";
import { InterestRateParams, SafetyModuleParams } from "../../src/types";
import { calculateBorrowAPY, calculateLpAPY, computeUtilizationRate } from "../../src";

describe("safety module tests", () => {
  const safetyParams: SafetyModuleParams = {
    stakedPercentageKink: 0.75,
    slope1: -0.01,
    slope2: -0.15,
    baseRewardRate: 0.1,
  };

  const irParams: InterestRateParams = {
    urKink: 0.8,
    baseIR: 0.02,
    slope1: 0.1,
    slope2: 0.2,
  };

  const protocolReservePercentage = 0.1;

  it("computes annualizedStakerAPR", () => {
    expect(computeStakingRate(0, 100)).toBe(0);
    expect(computeStakingRate(10, 0)).toBe(0);

    let sr = 0.3;
    let apr = annualizedStakerAPR(sr, safetyParams);
    expect(apr).toBeCloseTo(0.1 * 0.3 + 0.05, 8);

    sr = 0.7;
    apr = annualizedStakerAPR(sr, safetyParams);
    const expected = 0.2 * (0.7 - 0.5) + 0.1 * 0.5 + 0.05;
    expect(apr).toBeCloseTo(expected, 8);
  });

  it("staker and LP APY are the same if no shares are staked", () => {
    const openInterest = 1000;
    const totalAssets = 2000;
    let stakedLpShares = 0;
    const totalLpShares = 400;
    const ur = computeUtilizationRate(openInterest, totalAssets);

    const due = correctedLpAPY(
      ur,
      irParams,
      protocolReservePercentage,
      stakedLpShares,
      totalLpShares,
      safetyParams
    );
    
    const result = calculateLpAPY(ur, irParams, protocolReservePercentage);
    
    expect(due).toBe(result);
  });

  it("staker APY is higher than LP APY", () => {
    const openInterest = 10_000;
    const totalAssets = 20_000;
    let stakedLpShares = 1_000;
    const totalLpShares = 20_000;
    const ur = computeUtilizationRate(openInterest, totalAssets);
    const lpApy = calculateLpAPY(ur, irParams, protocolReservePercentage);

    const sr = computeStakingRate(stakedLpShares, totalLpShares);
    const stakersApy = calculateStakersAPY(sr, safetyParams);

    const correctedApy = correctedLpAPY(
      ur,
      irParams,
      protocolReservePercentage,
      stakedLpShares,
      totalLpShares,
      safetyParams
    );

    console.log("lpApy", lpApy);
    console.log("stakersApy", stakersApy);
    console.log("correctedApy", correctedApy);

    expect(lpApy).toBeLessThan(stakersApy);
    expect(lpApy).toBeGreaterThan(correctedApy);
  });
});
