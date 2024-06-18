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

export type InterestRateParams = {
    urKink: bigint;
    baseIR: bigint;
    slope1: bigint;
    slope2: bigint;
    avgBlocktime: bigint;
}
