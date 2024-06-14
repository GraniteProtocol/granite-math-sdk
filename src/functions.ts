import {Collateral} from "./types";


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

    return  1 - (currentDebt / totalCollateralValue);
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
    for (const { amount, price, maxLTV } of collaterals) {
        if (!maxLTV) {
            throw new Error('Collateral max LTV is not defined.');
        }
        sum += amount * price * maxLTV;
    }
    return sum;
}

export function calculateAvailableToBorrow(maxDebtAmt: number, outstandingDebtAmt: number, freeLiquidityInProtocol: number): number {
    return Math.min(maxDebtAmt - outstandingDebtAmt, freeLiquidityInProtocol);
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
