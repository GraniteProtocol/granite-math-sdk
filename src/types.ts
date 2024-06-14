export interface Collateral {
    amount: number;
    price: number;
    liquidationLTV?: number;
    maxLTV?: number;
}