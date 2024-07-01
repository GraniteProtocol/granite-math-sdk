import {Collateral, InterestRateParams} from "./types";

export function computeUtilizationRate(openInterest: number, totalAssets: number): number {
    if (totalAssets == 0) return 0;
    return openInterest / totalAssets;
}

export function calculateDueInterest(debtAmt: number, openInterest: number, totalAssets: number, irParams: InterestRateParams, blocks: number): number {
    const ur: number = computeUtilizationRate(openInterest, totalAssets);
    const ir = annualizedAPR(ur, irParams);

    return debtAmt * (1 + ir / (365 * 24 * 60 * 60)) ** (blocks * irParams.avgBlocktime);
}

export function convertDebtSharesToAssets(debtShares: number, openInterest: number, totalDebtShares: number, totalAssets: number, irParams: InterestRateParams, blocks: number): number {
    if (totalDebtShares == 0) return 0;
    
    const correctedOpenInterest = calculateDueInterest(openInterest, openInterest, totalAssets, irParams, blocks);

    return debtShares * correctedOpenInterest / totalDebtShares;
}

/**
 * @param ur utilization rate
 * @param irParams parameters from the interest rate contracts
 */
export function annualizedAPR(ur: number, irParams: InterestRateParams) {
    let ir: number;
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
    userDebtShares: number,
    totalDebtShares: number,
    openInterest: number,
    totalAssets: number,
    irParams: InterestRateParams,
    blocks: number
): number {
    if (totalDebtShares == 0) return 0;

    const sharePrice = openInterest / totalDebtShares;
    const debtAmt = userDebtShares * sharePrice;

    return calculateDueInterest(debtAmt, openInterest, totalAssets, irParams, blocks);
}

/**
 * @param collaterals the list of collaterals the user has deposited
 * @param currentDebt current user debt in assets
 */
export function calculateAccountHealth(collaterals: Collateral[], currentDebt: number): number {
    const totalCollateralValue = collaterals.reduce((total, collateral) => {
        if (!collateral.liquidationLTV) {
            throw new Error('Liquidity LTV is not defined');
        }
        return total + (collateral.amount * collateral.price * collateral.liquidationLTV);
    }, 0);

    if (currentDebt === 0) {
        throw new Error('Current debt cannot be zero.');
    }

    return totalCollateralValue / currentDebt;
}

export function calculateDrop(collaterals: Collateral[], currentDebt: number): number {
    const totalCollateralValue = collaterals.reduce((total, collateral) => {
        if (!collateral.liquidationLTV) {
            throw new Error('Liquidity LTV is not defined');
        }
        return total + (collateral.amount * collateral.price * collateral.liquidationLTV);
    }, 0);

    if (totalCollateralValue === 0) {
        throw new Error('Total collateral value cannot be zero.');
    }

    return 1 - (currentDebt / totalCollateralValue);
}

export function calculateTotalCollateralValue(collaterals: Collateral[]): number {
    return collaterals.reduce((total, collateral) => {
        return total + (collateral.amount * collateral.price);
    }, 0);
}

export function calculateAccountLTV(accountTotalDebt: number, collaterals: Collateral[]): number {
    const accountCollateralValue = calculateTotalCollateralValue(collaterals);

    if (accountCollateralValue === 0) {
        throw new Error('Account collateral value cannot be zero.');
    }

    return accountTotalDebt / accountCollateralValue;
}

export function calculateBorrowCapacity(collaterals: Collateral[]): number {
    let sum = 0;
    for (const {amount, price, maxLTV} of collaterals) {
        if (!maxLTV) {
            throw new Error('Collateral max LTV is not defined.');
        }
        sum += amount * price * maxLTV;
    }
    return sum;
}

export function calculateAvailableToBorrow(maxDebtAmt: number, outstandingDebtAmt: number, freeLiquidityInProtocol: number): number {
    const availableDebt = maxDebtAmt - outstandingDebtAmt;
    // return Math.min(availableDebt, freeLiquidityInProtocol);
    return availableDebt < freeLiquidityInProtocol ? availableDebt : freeLiquidityInProtocol;
}

export function calculateAccountMaxLTV(collaterals: Collateral[]): number {
    const sumCollateralMaxTLV = collaterals.reduce((sum, collateral) => {
        if (collateral.maxLTV !== undefined) {
            return sum + collateral.maxLTV * (collateral.amount * collateral.price);
        } else {
            throw new Error('MaxTLV is not defined for one or more collaterals.');
        }
    }, 0);
    const sumCollateralValue = collaterals.reduce((sum, collateral) => sum + (collateral.amount * collateral.price), 0);
    return sumCollateralValue !== 0 ? sumCollateralMaxTLV / sumCollateralValue : 0;
}

export function calculateAccountLiqLTV(collaterals: Collateral[]): number {
    const sumCollateralLiqTLV = collaterals.reduce((sum, collateral) => {
        if (collateral.liquidationLTV !== undefined) {
            return sum + collateral.liquidationLTV * (collateral.amount * collateral.price);
        } else {
            throw new Error('LiquidationLTV is not defined for one or more collaterals.');
        }
    }, 0);
    const sumCollateralValue = collaterals.reduce((sum, collateral) => sum + (collateral.amount * collateral.price), 0);
    return sumCollateralValue !== 0 ? sumCollateralLiqTLV / sumCollateralValue : 0;
}

export function calculateLiquidationPoint(accountDebt: number, accountLiqLTV: number): number {
    return accountLiqLTV !== 0 ? accountDebt / accountLiqLTV : 0;
}
