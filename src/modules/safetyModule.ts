/**
 * Safety Module
 *
 * This module provides utility functions to compute the
 * APY and withdrawal queue status of the Granite safety module
 */

import { secondsInAYear } from "../constants";
import { InterestRateParams, SafetyModuleParams } from "../types";
import { annualizedAPR } from "./borrow";

export function stakingRate(stakedLpShares: number, totalLpShares: number): number {
  if (totalLpShares == 0) return 0;
  return stakedLpShares / totalLpShares;
}

export function stakersRewardRate(sr: number, params: SafetyModuleParams): number {
  let rr: number;
  if (sr < params.stakedPercentageKink) rr = params.slope1 * sr + params.baseRewardRate;
  else
    rr =
      params.slope2 * (sr - params.stakedPercentageKink) +
      params.slope1 * params.stakedPercentageKink +
      params.baseRewardRate;

  return rr;
}

export function lpApyWithStaking(
  ur: number,
  irParams: InterestRateParams,
  protocolReservePercentage: number,
  sr: number,
  smParams: SafetyModuleParams,
) {
  if (ur == 0) return 0;
  else {
    const rewardRate = stakersRewardRate(sr, smParams);
    const lpAPR =
      annualizedAPR(ur, irParams) * (1 - rewardRate - protocolReservePercentage) * ur;
    return (1 + lpAPR / secondsInAYear) ** secondsInAYear - 1;
  }
}

export function stakerAPY(
  ur: number,
  irParams: InterestRateParams,
  protocolReservePercentage: number,
  sr: number,
  smParams: SafetyModuleParams,
) {
  if (ur == 0) return 0;
  else {
    const rewardRate = stakersRewardRate(sr, smParams);
    const lpAPR =
      annualizedAPR(ur, irParams) * (1 - rewardRate - protocolReservePercentage) * ur + rewardRate * sr * ur;
    return (1 + lpAPR / secondsInAYear) ** secondsInAYear - 1;
  }
}
