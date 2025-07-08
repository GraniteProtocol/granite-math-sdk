import { InterestRateParams, SafetyModuleParams } from "../../src/types";
import { calculateLpAPY, computeUtilizationRate, lpApyWithStaking, stakersRewardRate, stakingAPY, stakingRate } from "../../src";

describe("safety module tests", () => {
  const safetyParams: SafetyModuleParams = {
    stakedPercentageKink: 0.8,
    slope1: -0.1,
    slope2: -0.15,
    baseRewardRate: 0.1,
  };

  const irParams: InterestRateParams = {
    urKink: 0.8,
    baseIR: 0.01,
    slope1: 0.1,
    slope2: 0.15,
  };

  const protocolReservePercentage = 0.1;

  it("correctly handles stakingRate edge cases", () => {
    expect(stakingRate(0, 100)).toBe(0);
    expect(stakingRate(10, 0)).toBe(0);
  });

  it("computes stakersRewardRate", () => {
    // below king
    let sr = 0.3;
    let apr = stakersRewardRate(sr, safetyParams);
    expect(apr).toBe(0.07);

    // above kink
    sr = 0.8;
    apr = stakersRewardRate(sr, safetyParams);
    expect(apr).toBeCloseTo(0.01999, 3);
  });

  it("APY is 0 if ur or sr is 0", () => {
    expect(lpApyWithStaking(
      0,
      irParams,
      protocolReservePercentage,
      0,
      safetyParams
    )).toBe(0);

    expect(stakingAPY(
      0,
      irParams,
      protocolReservePercentage,
      0,
      safetyParams
    )).toBe(0);
  });

  it("staker and LP APY are the same if no shares are staked", () => {
    const openInterest = 1000;
    const totalAssets = 2000;
    let stakedLpShares = 0;
    const totalLpShares = 2000;

    const ur = computeUtilizationRate(openInterest, totalAssets);
    const sr = stakingRate(stakedLpShares, totalLpShares);
    const base = lpApyWithStaking(
      ur,
      irParams,
      protocolReservePercentage,
      sr,
      safetyParams
    );
    
    const stakers = stakingAPY(
      ur,
      irParams,
      protocolReservePercentage,
      sr,
      safetyParams
    );
    
    expect(base).toBe(stakers);
  });

  it("staker APY is higher than LP APY", () => {
    const openInterest = 10_000;
    const totalAssets = 20_000;
    let stakedLpShares = 10_000;
    const totalLpShares = 20_000;

    const ur = computeUtilizationRate(openInterest, totalAssets);
    const sr = stakingRate(stakedLpShares, totalLpShares);
    const lpApy = calculateLpAPY(ur, irParams, protocolReservePercentage);
    const stakersApy = stakingAPY(
      ur,
      irParams,
      protocolReservePercentage,
      sr,
      safetyParams
    );

    const correctedApy = lpApyWithStaking(
      ur,
      irParams,
      protocolReservePercentage,
      sr,
      safetyParams
    );

    expect(lpApy).toBeLessThan(stakersApy);
    expect(lpApy).toBeGreaterThan(correctedApy);
  });
});
