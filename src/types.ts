export interface CollateralParams {
  name?: string;
  liquidationLTV?: number;
  liquidationPremium?: number;
  maxLTV?: number;
  cap?: number;
}

export interface Collateral extends CollateralParams {
  amount: number;
  price: number;
}

export type InterestRateParams = {
  urKink: number;
  baseIR: number;
  slope1: number;
  slope2: number;
};
