export interface CollateralParams {
    liquidationLTV?: bigint;
    liquidationPremium?: bigint;
    maxLTV?: bigint;
    cap?: bigint;
}

export interface Collateral extends CollateralParams {
    amount: bigint;
    price: bigint;
}
