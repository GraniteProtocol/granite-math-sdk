import { liquidatorMaxRepayAmount, Collateral } from "../../src";

describe("Liquidation Module", () => {
  const defaultIrParams = {
    slope1: 0.03,
    slope2: 0.5,
    baseIR: 0.01,
    urKink: 0.8,
  };

  it("calculates max repay amount correctly", () => {
    const collateral: Collateral = {
      liquidationPremium: 0.01,
      maxLTV: 0.5,
      liquidationLTV: 0.7,
      amount: 1000,
      price: 1,
    };

    const amt = liquidatorMaxRepayAmount(
      10000, // debtShares
      1000, // openInterest
      10000, // totalDebtShares
      20000, // totalAssets
      defaultIrParams,
      3600,
      collateral
    );

    expect(amt).toBeCloseTo(1023.9);
  });

  it("throws error when liquidation parameters are undefined", () => {
    const collateral: Collateral = {
      maxLTV: 0.5,
      amount: 1000,
      price: 1,
    } as Collateral;

    expect(() =>
      liquidatorMaxRepayAmount(
        10000,
        1000,
        10000,
        20000,
        defaultIrParams,
        3600,
        collateral
      )
    ).toThrow("Liquidation LTV or liquidation premium are not defined");
  });

  it("handles zero collateral amount", () => {
    const collateral: Collateral = {
      liquidationPremium: 0.01,
      maxLTV: 0.5,
      liquidationLTV: 0.7,
      amount: 0,
      price: 1,
    };

    const amt = liquidatorMaxRepayAmount(
      10000,
      1000,
      10000,
      20000,
      defaultIrParams,
      3600,
      collateral
    );

    expect(amt).toBeGreaterThan(0);
  });

  it("handles zero collateral price", () => {
    const collateral: Collateral = {
      liquidationPremium: 0.01,
      maxLTV: 0.5,
      liquidationLTV: 0.7,
      amount: 1000,
      price: 0,
    };

    const amt = liquidatorMaxRepayAmount(
      10000,
      1000,
      10000,
      20000,
      defaultIrParams,
      3600,
      collateral
    );

    expect(amt).toBeGreaterThan(0);
  });

  it("handles high liquidation premium", () => {
    const collateral: Collateral = {
      liquidationPremium: 0.5, // 50% premium
      maxLTV: 0.5,
      liquidationLTV: 0.7,
      amount: 1000,
      price: 1,
    };

    const amt = liquidatorMaxRepayAmount(
      10000,
      1000,
      10000,
      20000,
      defaultIrParams,
      3600,
      collateral
    );

    expect(amt).toBeLessThan(10000); // Should be less than total debt
  });

  it("handles different utilization rates", () => {
    const collateral: Collateral = {
      liquidationPremium: 0.01,
      maxLTV: 0.5,
      liquidationLTV: 0.7,
      amount: 1000,
      price: 1,
    };

    const lowUtilization = liquidatorMaxRepayAmount(
      10000,
      1000, // openInterest
      10000,
      100000, // totalAssets (1% utilization)
      defaultIrParams,
      3600,
      collateral
    );

    const highUtilization = liquidatorMaxRepayAmount(
      10000,
      80000, // openInterest
      10000,
      100000, // totalAssets (80% utilization)
      defaultIrParams,
      3600,
      collateral
    );

    expect(highUtilization).toBeGreaterThan(lowUtilization);
  });
});
