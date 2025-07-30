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

export function leverageHelper(collateral: Collateral, leverage: number, debt: number) {
  if (leverage < 1) throw new Error("Invalid leverage value");
  const collateralValue = collateral.amount * collateral.price * (leverage - 1);
  return { collateral: collateralValue, debt: collateralValue - debt};
}
