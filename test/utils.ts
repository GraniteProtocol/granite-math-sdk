import { Collateral } from "../src";

export const createCollateral = (
  amount: number,
  price: number,
  maxLTV?: number,
): Collateral => ({
  amount,
  price,
  maxLTV,
});
