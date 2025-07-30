/**
 * Leverage Module
 *
 * This module provides helpers to compute the max leverage 
 * and required collateral to swap for margin trading
 */

import { Collateral } from "../types";
import { calculateAccountMaxLTV } from "./account";

export function maxLeverage(collaterals: Collateral[]): number {
  const maxLTV = calculateAccountMaxLTV(collaterals);
  if(maxLTV >= 1) return 1; // no leverage possible
  return 1 / (1 - maxLTV);
}

export function leveragedCollateral(collateral: Collateral, leverage: number): number {
  const collateralValue = collateral.amount * collateral.price;
  return collateralValue * leverage;
}

export function leveragedDebt(debt: number, leverage: number): number {
  return debt * leverage;
}
