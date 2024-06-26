import {Collateral, InterestRateParams} from "./types";

export function computeUtilizationRate(openInterest: bigint, totalAssets: bigint): bigint {
    if (totalAssets == 0n) return 0n;
    return openInterest / totalAssets;
}

export function calculateDueInterest(debtAmt: bigint, openInterest: bigint, totalAssets: bigint, irParams: InterestRateParams, blocks: bigint): bigint {
    const ur: bigint = computeUtilizationRate(openInterest, totalAssets);
    const ir = annualizedAPR(ur, irParams);

    return debtAmt * (1n + ir / (365n * 24n * 60n * 60n)) ** (blocks * irParams.avgBlocktime);
}

/**
 * @params ur utilization rate
 * @param irParams parameters from the interest rate contracts
 */
export function annualizedAPR(ur: bigint, irParams: InterestRateParams) {
    let ir: bigint;
    if (ur < irParams.urKink)
        ir = irParams.slope1 * ur + irParams.baseIR;
    else
        ir = irParams.slope2 * (ur - irParams.urKink) + irParams.slope1 * irParams.urKink + irParams.baseIR;
    
    return ir;
}

/**
 * @param userDebtShares current user debt in shares
 * @param totalDebtShares total amount of debt shares in the protocol
 * @param openInterest the protocol oustanding loans in asset terms
 * @param totalAssets the LPs deposited assets
 * @param irParams parameters from the interest rate contracts
 * @param blocks current block - last interest accrual block
 */
export function outstandingDebtAmt(
    userDebtShares: bigint,
    totalDebtShares: bigint,
    openInterest: bigint,
    totalAssets: bigint,
    irParams: InterestRateParams,
    blocks: bigint
): bigint {
    if (totalDebtShares == 0n) {
        throw new Error('No debt in the protocol');
    }

    const sharePrice = openInterest / totalDebtShares;
    const debtAmt = userDebtShares * sharePrice;

    return calculateDueInterest(debtAmt, openInterest, totalAssets, irParams, blocks);
}

/**
 * @param collaterals the list of collaterals the user has deposited
 * @param currentDebt current user debt in assets
 */
export function calculateAccountHealth(collaterals: Collateral[], currentDebt: bigint): bigint {
    const totalCollateralValue = collaterals.reduce((total, collateral) => {
        if (!collateral.liquidationLTV) {
            throw new Error('Liquidity LTV is not defined');
        }
        return total + (collateral.amount * collateral.price * collateral.liquidationLTV);
    }, 0n);

    if (currentDebt === 0n) {
        throw new Error('Current debt cannot be zero.');
    }

    return totalCollateralValue / currentDebt;
}

export function calculateDrop(collaterals: Collateral[], currentDebt: bigint): bigint {
    const totalCollateralValue = collaterals.reduce((total, collateral) => {
        if (!collateral.liquidationLTV) {
            throw new Error('Liquidity LTV is not defined');
        }
        return total + (collateral.amount * collateral.price * collateral.liquidationLTV);
    }, 0n);

    if (totalCollateralValue === 0n) {
        throw new Error('Total collateral value cannot be zero.');
    }

    return 1n - (currentDebt / totalCollateralValue);
}

export function calculateTotalCollateralValue(collaterals: Collateral[]): bigint {
    return collaterals.reduce((total, collateral) => {
        return total + (collateral.amount * collateral.price);
    }, 0n);
}

export function calculateAccountLTV(accountTotalDebt: bigint, collaterals: Collateral[]): bigint {
    const accountCollateralValue = calculateTotalCollateralValue(collaterals);

    if (accountCollateralValue === 0n) {
        throw new Error('Account collateral value cannot be zero.');
    }

    return accountTotalDebt / accountCollateralValue;
}

export function calculateBorrowCapacity(collaterals: Collateral[]): bigint {
    let sum = 0n;
    for (const {amount, price, maxLTV} of collaterals) {
        if (!maxLTV) {
            throw new Error('Collateral max LTV is not defined.');
        }
        sum += amount * price * maxLTV;
    }
    return sum;
}

export function calculateAvailableToBorrow(maxDebtAmt: bigint, outstandingDebtAmt: bigint, freeLiquidityInProtocol: bigint): bigint {
    const availableDebt = maxDebtAmt - outstandingDebtAmt;
    // return Math.min(availableDebt, freeLiquidityInProtocol);
    return availableDebt < freeLiquidityInProtocol ? availableDebt : freeLiquidityInProtocol;
}

export function calculateAccountMaxLTV(collaterals: Collateral[]): bigint {
    const sumCollateralMaxTLV = collaterals.reduce((sum, collateral) => {
        if (collateral.maxLTV !== undefined) {
            return sum + collateral.maxLTV * (collateral.amount * collateral.price);
        } else {
            throw new Error('MaxTLV is not defined for one or more collaterals.');
        }
    }, 0n);
    const sumCollateralValue = collaterals.reduce((sum, collateral) => sum + (collateral.amount * collateral.price), 0n);
    return sumCollateralValue !== 0n ? sumCollateralMaxTLV / sumCollateralValue : 0n;
}

export function calculateAccountLiqLTV(collaterals: Collateral[]): bigint {
    const sumCollateralLiqTLV = collaterals.reduce((sum, collateral) => {
        if (collateral.liquidationLTV !== undefined) {
            return sum + collateral.liquidationLTV * (collateral.amount * collateral.price);
        } else {
            throw new Error('LiquidationLTV is not defined for one or more collaterals.');
        }
    }, 0n);
    const sumCollateralValue = collaterals.reduce((sum, collateral) => sum + (collateral.amount * collateral.price), 0n);
    return sumCollateralValue !== 0n ? sumCollateralLiqTLV / sumCollateralValue : 0n;
}

export function calculateLiquidationPoint(accountDebt: bigint, accountLiqLTV: bigint): bigint {
    return accountLiqLTV !== 0n ? accountDebt / accountLiqLTV : 0n;
}
