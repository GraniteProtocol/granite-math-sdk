import {
  liquidatorMaxRepayAmount,
  calculateDrop,
  calculateLiquidationPoint,
  Collateral,
} from "../../src";
import { createCollateral } from "../utils";

describe("Liquidation Module", () => {
  const defaultIrParams = {
    slope1: 0.03,
    slope2: 0.5,
    baseIR: 0.01,
    urKink: 0.8,
  };

  describe("Liquidation Trigger Calculations", () => {
    it("calculates drop correctly with single collateral", () => {
      const collaterals = [createCollateral(100, 10, 0.8, 0.8)];
      const currentDebt = 500;

      const drop = calculateDrop(collaterals, currentDebt);
      expect(drop).toBeCloseTo(0.375);
    });

    it("returns 0 when total collateral value is 0", () => {
      const collaterals: Collateral[] = [];
      const currentDebt = 1000;

      const drop = calculateDrop(collaterals, currentDebt);
      expect(drop).toBe(0);
    });

    it("handles collaterals with undefined liquidationLTV", () => {
      const collaterals = [
        {
          amount: 100,
          price: 10,
          maxLTV: 0.8,
        } as Collateral,
      ];
      const currentDebt = 500;

      expect(() => calculateDrop(collaterals, currentDebt)).toThrow(
        "LiquidationLTV is not defined",
      );
    });
  });

  describe("Liquidation Point Calculations", () => {
    it("calculates liquidation point correctly", () => {
      const lp = calculateLiquidationPoint(
        0.8, // accountLiqLTV
        100, // debt shares
        1000, // open interest
        1000, // total debt shares
        10000, // total assets (10% utilization rate)
        defaultIrParams,
        1, // second
      );
      expect(lp).toBeCloseTo(125);
    });

    it("returns 0 when accountLiqLTV is 0", () => {
      const lp = calculateLiquidationPoint(
        0,
        100,
        1000,
        1000,
        10000,
        defaultIrParams,
        1,
      );
      expect(lp).toBe(0);
    });
  });

  describe("Liquidator Max Repay Calculations", () => {
    it("prevents repayment higher than actual debt (regression test for original issue)", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.01, // 1% premium
        maxLTV: 0.8,
        liquidationLTV: 0.7,
        amount: 1000,
        price: 1,
      };

      // This was the original problematic test case
      const amt = liquidatorMaxRepayAmount(
        10000, // debtShares
        1000, // openInterest
        10000, // totalDebtShares
        20000, // totalAssets
        defaultIrParams,
        3600, // 1 hour
        collateral
      );

      // Should never exceed openInterest (1000)
      expect(amt).toBeLessThanOrEqual(1000);

      // Should be capped by collateralValue / (1 + premium) ≈ 990.099
      expect(amt).toBeCloseTo(990.099, 3);

      // Verify it's using the collateral cap rather than maxRepayCalc
      const collateralCap =
        collateral.amount / (1 + collateral.liquidationPremium!);
      expect(amt).toBeCloseTo(collateralCap, 3);
    });

    it("calculates max repay with proper secured value consideration", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.1, // 10% premium
        maxLTV: 0.8,
        liquidationLTV: 0.7,
        amount: 1000,
        price: 1,
      };

      const amt = liquidatorMaxRepayAmount(
        1000, // debtShares (all debt)
        1000, // openInterest
        1000, // totalDebtShares
        2000, // totalAssets
        defaultIrParams,
        3600,
        collateral
      );

      // Calculations:
      // collateralValue = 1000
      // securedValue = 1000 * 0.7 = 700
      // debtAssets ≈ 1000 (plus small interest)
      // denominator = 1 - (1 + 0.1) * 0.7 = 0.23
      // maxRepayCalc = (1000 - 700) / 0.23 ≈ 1304.35
      // collateralCap = 1000 / 1.1 ≈ 909.09
      // Should return min(909.09, 1000) = 909.09
      expect(amt).toBeCloseTo(909.09, 2);
    });

    it("returns 0 when debt is fully secured by collateral", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.8,
        liquidationLTV: 0.7,
        amount: 2000, // High collateral amount
        price: 1,
      };

      const amt = liquidatorMaxRepayAmount(
        100, // Small debt
        1000,
        1000,
        2000,
        defaultIrParams,
        3600,
        collateral,
      );

      // Debt is fully secured by collateral, so no liquidation needed
      expect(amt).toBe(0);
    });

    it("respects collateral cap when debt is high", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.8,
        liquidationLTV: 0.7,
        amount: 100, // Low collateral amount
        price: 1,
      };

      const amt = liquidatorMaxRepayAmount(
        1000, // High debt
        1000,
        1000,
        2000,
        defaultIrParams,
        3600,
        collateral,
      );

      // Collateral cap = 100 / 1.1 ≈ 90.91
      expect(amt).toBeCloseTo(90.91, 2);
    });

    it("handles zero collateral amount", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.8,
        liquidationLTV: 0.7,
        amount: 0,
        price: 1,
      };

      const amt = liquidatorMaxRepayAmount(
        1000,
        1000,
        1000,
        2000,
        defaultIrParams,
        3600,
        collateral,
      );

      expect(amt).toBe(0);
    });

    it("throws error when liquidation parameters are undefined", () => {
      const collateral = {
        maxLTV: 0.8,
        amount: 1000,
        price: 1,
      } as Collateral;

      expect(() =>
        liquidatorMaxRepayAmount(
          1000,
          1000,
          1000,
          2000,
          defaultIrParams,
          3600,
          collateral
        )
      ).toThrow("Liquidation LTV or liquidation premium are not defined");
    });
  });
});
