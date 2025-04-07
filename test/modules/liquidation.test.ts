import {
  liquidatorMaxRepayAmount,
  calculateDrop,
  calculateLiquidationPoint,
  calculateCollateralToTransfer,
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
        maxLTV: 0.6,
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
        collateral,
        [collateral], // Pass the same collateral as allCollaterals
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
        maxLTV: 0.6,
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
        collateral,
        [collateral],
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

    it("handles multi-collateral case correctly", () => {
      const collateralA: Collateral = {
        liquidationPremium: 0.1, // 10% premium
        maxLTV: 0.7,
        liquidationLTV: 0.78,
        amount: 100,
        price: 10, // Value = 1000
      };

      const collateralB: Collateral = {
        liquidationPremium: 0.12, // 12% premium
        maxLTV: 0.6,
        liquidationLTV: 0.7,
        amount: 664,
        price: 1, // Value = 664
      };

      const collateralC: Collateral = {
        liquidationPremium: 0.15, // 15% premium
        maxLTV: 0.5,
        liquidationLTV: 0.6,
        amount: 350,
        price: 1, // Value = 350
      };

      const allCollaterals = [collateralA, collateralB, collateralC];

      // Test liquidating collateral B
      const amtB = liquidatorMaxRepayAmount(
        1000, // debtShares
        1014, // openInterest (matches image)
        1000, // totalDebtShares
        2000, // totalAssets
        defaultIrParams,
        3600,
        collateralB,
        allCollaterals,
      );

      // Calculations for collateral B:
      // totalSecuredValue = (1000 × 0.78) + (664 × 0.70) + (350 × 0.60) = 1247.8
      // denominator = 1 - (1 + 0.12) × 0.70 = 0.156
      // maxRepayCalc = (1014 - 1247.8) / 0.156 = -1497.44
      // collateralCap = 664 / (1 + 0.12) = 592.86
      // maxRepayAllowed = max(min(-1497.44, 592.86), 0) = 0
      expect(amtB).toBe(0);

      // Test liquidating collateral B with higher debt
      const amtBHighDebt = liquidatorMaxRepayAmount(
        2000, // Higher debt shares
        2014, // Higher openInterest
        1000,
        2000,
        defaultIrParams,
        3600,
        collateralB,
        allCollaterals,
      );

      // For higher debt:
      // debtAssets ≈ 2014
      // totalSecuredValue = 1247.8 (same as before)
      // maxRepayCalc = (2014 - 1247.8) / 0.156 = 4910.38
      // collateralCap = 664 / 1.12 = 592.86
      // maxRepayAllowed = max(min(4910.38, 592.86), 0) = 592.86
      expect(amtBHighDebt).toBeCloseTo(592.86, 2);
    });

    it("returns 0 when debt is fully secured by collateral", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
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
        [collateral],
      );

      // Debt is fully secured by collateral, so no liquidation needed
      expect(amt).toBe(0);
    });

    it("respects collateral cap when debt is high", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
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
        [collateral],
      );

      // Collateral cap = 100 / 1.1 ≈ 90.91
      expect(amt).toBeCloseTo(90.91, 2);
    });

    it("handles zero collateral amount", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
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
        [collateral],
      );

      expect(amt).toBe(0);
    });

    it("throws error when liquidation parameters are undefined", () => {
      const collateral = {
        maxLTV: 0.6,
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
          collateral,
          [collateral],
        ),
      ).toThrow("Liquidation LTV or liquidation premium are not defined");
    });

    it("handles denominator near zero case", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.25, // 25% premium
        maxLTV: 0.7,
        liquidationLTV: 0.79,
        amount: 1000,
        price: 1,
      };

      const amt = liquidatorMaxRepayAmount(
        2000, // High debt to ensure positive maxRepayCalc
        2000,
        1000,
        2000,
        defaultIrParams,
        3600,
        collateral,
        [collateral],
      );

      // Should still be capped by collateralCap = 1000/1.25 = 800
      expect(amt).toBeCloseTo(800, 2);
    });

    it("handles multiple collaterals of same type", () => {
      const collateral1: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
        liquidationLTV: 0.7,
        amount: 500,
        price: 1,
      };

      const collateral2: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
        liquidationLTV: 0.7,
        amount: 500,
        price: 1,
      };

      const amt = liquidatorMaxRepayAmount(
        1500,
        1500,
        1000,
        2000,
        defaultIrParams,
        3600,
        collateral1,
        [collateral1, collateral2],
      );

      // Total secured value = (500 + 500) * 0.7 = 700
      // maxRepayCalc = (1500 - 700) / (1 - 1.1 * 0.7) = 2666.67
      // collateralCap = 500 / 1.1 = 454.55
      expect(amt).toBeCloseTo(454.55, 2);
    });

    it("handles different price scales correctly", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
        liquidationLTV: 0.7,
        amount: 1, // 1 BTC
        price: 50000, // $50,000 per BTC
      };

      const amt = liquidatorMaxRepayAmount(
        60000,
        60000,
        1000,
        100000,
        defaultIrParams,
        3600,
        collateral,
        [collateral],
      );

      // collateralCap = (1 * 50000) / 1.1 = 45454.55
      expect(amt).toBeCloseTo(45454.55, 2);
    });

    it("handles zero and negative prices", () => {
      const zeroPrice: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
        liquidationLTV: 0.7,
        amount: 1000,
        price: 0,
      };

      const negativePrice: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
        liquidationLTV: 0.7,
        amount: 1000,
        price: -1,
      };

      const amtZero = liquidatorMaxRepayAmount(
        1000,
        1000,
        1000,
        2000,
        defaultIrParams,
        3600,
        zeroPrice,
        [zeroPrice],
      );

      const amtNegative = liquidatorMaxRepayAmount(
        1000,
        1000,
        1000,
        2000,
        defaultIrParams,
        3600,
        negativePrice,
        [negativePrice],
      );

      expect(amtZero).toBe(0);
      expect(amtNegative).toBe(0);
    });

    it("throws error when any collateral in allCollaterals has undefined liquidationLTV", () => {
      const validCollateral: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
        liquidationLTV: 0.7,
        amount: 1000,
        price: 1,
      };

      const invalidCollateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
        // liquidationLTV is undefined
        amount: 500,
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
          validCollateral, // Main collateral is valid
          [validCollateral, invalidCollateral], // But one of allCollaterals is invalid
        ),
      ).toThrow("LiquidationLTV is not defined for one or more collaterals");
    });
  });

  describe("Collateral Transfer Calculations", () => {
    it("calculates collateral to transfer correctly", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
        liquidationLTV: 0.7,
        amount: 1000,
        price: 2,
      };

      const collateralToTransfer = calculateCollateralToTransfer(
        100,
        collateral,
      );

      // For repayAmount = 100:
      // liquidationReward = 100 * 0.1 = 10
      // collateralToTransfer = (100 + 10) / 2 = 55
      expect(collateralToTransfer).toBe(55);
    });

    it("handles different price scales in collateral transfer", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
        liquidationLTV: 0.7,
        amount: 1,
        price: 50000, // $50,000 per unit
      };

      const collateralToTransfer = calculateCollateralToTransfer(
        5500,
        collateral,
      );

      // For repayAmount = 5500:
      // liquidationReward = 5500 * 0.1 = 550
      // collateralToTransfer = (5500 + 550) / 50000 = 0.1210
      expect(collateralToTransfer).toBeCloseTo(0.121, 4);
    });

    it("handles precision edge cases in collateral transfer", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.1,
        maxLTV: 0.6,
        liquidationLTV: 0.7,
        amount: 1,
        price: 0.0001, // Very small price
      };

      const collateralToTransfer = calculateCollateralToTransfer(
        0.00001,
        collateral,
      );
      expect(collateralToTransfer).toBeGreaterThan(0);
      expect(Number.isFinite(collateralToTransfer)).toBe(true);
    });

    it("throws error when liquidation premium is undefined", () => {
      const collateral = {
        maxLTV: 0.6,
        liquidationLTV: 0.7,
        amount: 1000,
        price: 1,
      } as Collateral;

      expect(() => calculateCollateralToTransfer(100, collateral)).toThrow(
        "Liquidation premium is not defined",
      );
    });
  });
});
