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
  maxLTV?: number;
}

export type InterestRateParams = {
  urKink: number;
  baseIR: number;
  slope1: number;
  slope2: number;
};

export type Epoch = {
  startTimestamp: number;
  endTimestamp: number;
  totalRewards: number;
  targetAPR: number;
  cap: number;
};

export type Snapshot = {
  timestamp: number;
  totalLpShares: number;
  userLpShares: number;
};
