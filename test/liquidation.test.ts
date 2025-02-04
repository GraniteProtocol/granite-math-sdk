import { liquidatorMaxRepayAmount } from "../src/functions";
import { Collateral } from "../src/types";

describe("tests on liquidation logic", () => {
  it("test max repay calculation", () => {
    const collateral: Collateral = {
      liquidationPremium: 0.01,
      maxLTV: 0.5,
      liquidationLTV: 0.7,
      amount: 1000,
      price: 1,
    };

    const irParams = {
      slope1: 0.03,
      slope2: 0.5,
      baseIR: 0.01,
      urKink: 0.8,
    };

    const amt = liquidatorMaxRepayAmount(
      10000, // debtShares
      1000, // openInterest
      10000, // totalDebtShares
      20000, // totalAssets
      irParams,
      3600,
      collateral,
    );

    expect(amt).toBeCloseTo(1023.9);
  });
});
