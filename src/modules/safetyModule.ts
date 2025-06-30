/**
 * Safety Module
 *
 * This module provides utility functions to compute the
 * APY and withdrawal queue status of the Granite safety module
 */

import { secondsInAYear } from "../constants";
import { InterestRateParams, SafetyModuleParams } from "../types";
import { annualizedAPR, computeUtilizationRate } from "./borrow";
import { calculateLpAPY } from "./lp";

export function annualizedStakerAPR(sr: number, params: SafetyModuleParams): number {
  let rr: number;
  if (sr < params.stakedPercentageKink) rr = params.slope1 * sr + params.baseRewardRate;
  else
    rr =
      params.slope2 * (sr - params.stakedPercentageKink) +
      params.slope1 * params.stakedPercentageKink +
      params.baseRewardRate;

  return rr;
}

export function calculateStakersAPY(
  sr: number,
  params: SafetyModuleParams,
): number {
  if (sr == 0) return 0;
  else {
    const stakersAPR =
      annualizedStakerAPR(sr, params); // @todo should multiply by "sr"?
    return (1 + stakersAPR / secondsInAYear) ** secondsInAYear - 1;
  }
}

export function computeStakingRate(stakedLpShares: number, totalLpShares: number): number {
  if (totalLpShares == 0) return 0;
  return stakedLpShares / totalLpShares;
}

export function correctedLpAPY(
    ur: number,
    irParams: InterestRateParams,
    protocolReservePercentage: number,
    stakedLpShares: number,
    totalLpShares: number,
    params: SafetyModuleParams
): number {
    const sr = computeStakingRate(stakedLpShares, totalLpShares);
    const stakedLpApy = calculateStakersAPY(sr, params); 
    const baseLpApy = calculateLpAPY(ur, irParams, protocolReservePercentage);

    // Both are APYs, so just subtract
    return baseLpApy - stakedLpApy;
}
