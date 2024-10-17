import { Collateral, InterestRateParams } from "./types";

export const secondsInAYear = 365 * 24 * 60 * 60;

// a % number that can be above 100% (thus > 1) but never negative as it's the ratio of two non-negative numbers
export function computeUtilizationRate(
  openInterest: number,
  totalAssets: number,
): number {
  if (totalAssets == 0) return 0;
  return openInterest / totalAssets;
}

export function calculateDueInterest(
  debtAmt: number,
  openInterest: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number,
): number {
  const ur: number = computeUtilizationRate(openInterest, totalAssets);
  const ir = annualizedAPR(ur, irParams);

  return debtAmt * (1 + ir / secondsInAYear) ** timeDelta;
}

// computes just the interests due on a given sum, using the same calculation as above
export function compoundedInterest(
  debtAmt: number,
  openInterest: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number,
): number {
  const ur: number = computeUtilizationRate(openInterest, totalAssets);
  const ir = annualizedAPR(ur, irParams);

  const interestAccrued =
    debtAmt * ((1 + ir / secondsInAYear) ** timeDelta - 1);

  return interestAccrued;
}

// transforms LP assets into an equivalent amount of shares using the latest share price
export function convertLpAssetsToShares(
  assets: number,
  totalShares: number,
  totalAssets: number,
  openInterest: number,
  protocolReservePercentage: number,
  irParams: InterestRateParams,
  timeDelta: number,
): number {
  if (totalAssets == 0) return 0;

  const corretedOpenInterest = compoundedInterest(
    openInterest,
    openInterest,
    totalAssets,
    irParams,
    timeDelta,
  );
  const accruedInterest =
    corretedOpenInterest * (1 - protocolReservePercentage);

  return (assets * totalShares) / (accruedInterest + totalAssets);
}

export function convertLpSharesToAssets(
  shares: number,
  totalShares: number,
  totalAssets: number,
  openInterest: number,
  protocolReservePercentage: number,
  irParams: InterestRateParams,
  timeDelta: number,
): number {
  if (totalShares == 0) return 0;

  const corretedOpenInterest = compoundedInterest(
    openInterest,
    openInterest,
    totalAssets,
    irParams,
    timeDelta,
  );
  const accruedInterest =
    corretedOpenInterest * (1 - protocolReservePercentage);

  return (shares * (accruedInterest + totalAssets)) / totalShares;
}

/**
 * @param userDebtShares current user debt in shares
 * @param totalDebtShares total amount of debt shares in the protocol
 * @param openInterest the protocol oustanding loans in asset terms
 * @param totalAssets the LPs deposited assets
 * @param irParams parameters from the interest rate contracts
 * @param timeDelta current timestamp - last interest accrual timestamp
 */
export function convertDebtSharesToAssets(
  debtShares: number,
  openInterest: number,
  totalDebtShares: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number,
): number {
  if (totalDebtShares == 0) return 0;

  const accruedInterest = compoundedInterest(
    openInterest,
    openInterest,
    totalAssets,
    irParams,
    timeDelta,
  );

  return (debtShares * (openInterest + accruedInterest)) / totalDebtShares;
}

/**
 * @param ur utilization rate
 * @param irParams parameters from the interest rate contracts
 */
export function annualizedAPR(ur: number, irParams: InterestRateParams) {
  let ir: number;
  if (ur < irParams.urKink) ir = irParams.slope1 * ur + irParams.baseIR;
  else
    ir =
      irParams.slope2 * (ur - irParams.urKink) +
      irParams.slope1 * irParams.urKink +
      irParams.baseIR;

  return ir;
}

export function calculateLpAPY(
  ur: number,
  irParams: InterestRateParams,
  protocolReservePercentage: number,
) {
  if (ur == 0) return 0;
  else {
    const lpAPR =
      annualizedAPR(ur, irParams) * (1 - protocolReservePercentage) * ur;
    return (1 + lpAPR / secondsInAYear) ** secondsInAYear - 1;
  }
}

export function calculateBorrowAPY(ur: number, irParams: InterestRateParams) {
  const borrowApr = annualizedAPR(ur, irParams);
  return (1 + borrowApr / secondsInAYear) ** secondsInAYear - 1;
}

/**
 * @param collaterals the list of collaterals the user has deposited
 * @param currentDebt current user debt in assets
 *
 * Account health value < 1 means the position is liquidable
 */
export function calculateAccountHealth(
  collaterals: Collateral[],
  currentDebt: number,
): number {
  const totalCollateralValue = collaterals.reduce((total, collateral) => {
    if (!collateral.liquidationLTV) {
      throw new Error("LiquidationLTV is not defined");
    }
    return (
      total + collateral.amount * collateral.price * collateral.liquidationLTV
    );
  }, 0);

  if (currentDebt == 0) {
    throw new Error("Current debt cannot be zero");
  }

  return totalCollateralValue / currentDebt;
}

export function calculateDrop(
  collaterals: Collateral[],
  currentDebt: number,
): number {
  const totalCollateralValue = collaterals.reduce((total, collateral) => {
    if (!collateral.liquidationLTV) {
      throw new Error("LiquidationLTV is not defined");
    }
    return (
      total + collateral.amount * collateral.price * collateral.liquidationLTV
    );
  }, 0);

  if (totalCollateralValue == 0) {
    return 0;
  }

  return 1 - currentDebt / totalCollateralValue;
}

// The sum of all deposited collateral amounts multiplied for their respective price
export function calculateTotalCollateralValue(
  collaterals: Collateral[],
): number {
  return collaterals.reduce((total, collateral) => {
    return total + collateral.amount * collateral.price;
  }, 0);
}

export function calculateWeightedLTV(collaterals: Collateral[]): number {
  const totalWeightedLTV = collaterals.reduce((total, collateral) => {
    const collateralValue = collateral.amount * collateral.price;
    if (!collateral.liquidationLTV) {
      throw new Error("LiquidationLTV is not defined");
    }
    return total + collateral.liquidationLTV * collateralValue;
  }, 0);

  return totalWeightedLTV;
}

export function calculateAccountLTV(
  accountTotalDebt: number,
  collaterals: Collateral[],
): number {
  const accountCollateralValue = calculateTotalCollateralValue(collaterals);

  if (accountCollateralValue == 0) {
    return 0;
  }

  return accountTotalDebt / accountCollateralValue;
}

export function calculateBorrowCapacity(collaterals: Collateral[]): number {
  let sum = 0;
  for (const { amount, price, maxLTV } of collaterals) {
    if (!maxLTV) {
      throw new Error("Collateral max LTV is not defined");
    }
    sum += amount * price * maxLTV;
  }
  return sum;
}

// How much a number of borrowers can take from the protocol at the current time
export function protocolAvailableToBorrow(
  freeLiquidity: number,
  reserveBalance: number,
): number {
  if (reserveBalance >= freeLiquidity) return 0;

  return freeLiquidity - reserveBalance;
}

// How much the user can borrow given their deposited collaterals
export function userAvailableToBorrow(
  collaterals: Collateral[],
  freeLiquidity: number,
  reserveBalance: number,
  currentDebt: number,
): number {
  const protocolFreeLiquidity = protocolAvailableToBorrow(
    freeLiquidity,
    reserveBalance,
  );
  return Math.min(
    protocolFreeLiquidity,
    Math.max(calculateBorrowCapacity(collaterals) - currentDebt, 0),
  );
}

export function calculateAccountMaxLTV(collaterals: Collateral[]): number {
  const totalCollateralValue = calculateTotalCollateralValue(collaterals);
  if (totalCollateralValue == 0) return 0;

  const totalWeightedLTV = collaterals.reduce((sum, collateral) => {
    if (collateral.maxLTV !== undefined) {
      return sum + collateral.maxLTV * (collateral.amount * collateral.price);
    } else {
      throw new Error("MaxLTV is not defined for one or more collaterals");
    }
  }, 0);

  return totalWeightedLTV / totalCollateralValue;
}

export function calculateAccountLiqLTV(collaterals: Collateral[]): number {
  const accountCollateralValue = calculateTotalCollateralValue(collaterals);
  if (accountCollateralValue == 0) {
    return 0;
  }

  const averageLTV = calculateWeightedLTV(collaterals);
  return averageLTV / accountCollateralValue;
}

export function calculateLiquidationPoint(
  accountLiqLTV: number,
  debtShares: number,
  openInterest: number,
  totalDebtShares: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number,
): number {
  const accountDebt = convertDebtSharesToAssets(
    debtShares,
    openInterest,
    totalDebtShares,
    totalAssets,
    irParams,
    timeDelta,
  );

  return accountLiqLTV !== 0 ? accountDebt / accountLiqLTV : 0;
}

export function calculateMaxRepayAmount(
  debtShares: number,
  openInterest: number,
  totalDebtShares: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number,
): number {
  const ur = computeUtilizationRate(openInterest, totalAssets);
  const borrowAPY = calculateBorrowAPY(ur, irParams);
  const debtAssets = convertDebtSharesToAssets(
    debtShares,
    openInterest,
    totalDebtShares,
    totalAssets,
    irParams,
    timeDelta,
  );
  const repayMultiplier = 1 + (borrowAPY / 100 / secondsInAYear) * (10 * 60);

  return debtAssets * repayMultiplier;
}

export function computeTotalEarning(
  shares: number,
  totalShares: number,
  totalAssets: number,
  openInterest: number,
  protocolReservePercentage: number,
  irParams: InterestRateParams,
  reserveBalance: number,
  timeDelta: number,
): number {
  return (
    convertLpSharesToAssets(
      shares,
      totalShares,
      totalAssets,
      openInterest,
      protocolReservePercentage,
      irParams,
      timeDelta,
    ) - reserveBalance
  );
}
