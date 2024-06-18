export interface CollateralParams {
    liquidationLTV?: number;
    liquidationPremium?: number;
    maxLTV?: number;
    cap?: number;
}

export interface Collateral extends CollateralParams {
    amount: number;
    price: number;
}
