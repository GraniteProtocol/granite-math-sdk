import {
  calculateAccountHealth,
  calculateAccountLTV,
  calculateAccountMaxLTV,
  calculateAccountLiqLTV,
  calculateLiquidationPoint,
  calculateDrop,
  calculateTotalCollateralValue,
  calculateWeightedLTV,
  Collateral,
} from "../../src";
import { createCollateral } from "../utils";

describe("Account Module", () => {
  describe("calculateAccountHealth", () => {
    it("calculates account health correctly with single collateral", () => {
      const collaterals = [createCollateral(100, 10, 0.8, 0.8)];
      const currentDebt = 500;

      const health = calculateAccountHealth(collaterals, currentDebt);

      // Expected account health: (100 * 10 * 0.8) / 500 = 1.6
      expect(health).toBe(1.6);
    });

    it("calculates account health correctly with multiple collaterals", () => {
      const collaterals = [
        createCollateral(100, 10, 0.8, 0.8),
        createCollateral(200, 5, 0.7, 0.7),
        createCollateral(50, 20, 0.9, 0.9),
      ];
      const currentDebt = 1000;

      const health = calculateAccountHealth(collaterals, currentDebt);

      // Expected account health: (100 * 10 * 0.8 + 200 * 5 * 0.7 + 50 * 20 * 0.9) / 1000 = 2.4
      expect(health).toBe(2.4);
    });

    it("returns error when debt is zero", () => {
      const collaterals = [createCollateral(100, 10, 0.8, 0.8)];
      const currentDebt = 0;

      expect(() => calculateAccountHealth(collaterals, currentDebt)).toThrow(
        "Current debt cannot be zero"
      );
    });

    it("returns zero when no collaterals are provided", () => {
      const collaterals: Collateral[] = [];
      const currentDebt = 1000;

      const health = calculateAccountHealth(collaterals, currentDebt);

      expect(health).toBe(0);
    });
  });

  describe("calculateAccountLTV", () => {
    it("calculates account LTV correctly with single collateral", () => {
      const accountTotalDebt = 500;
      const collaterals = [createCollateral(100, 10, 0.7, 0.7)];

      const ltv = calculateAccountLTV(accountTotalDebt, collaterals);

      // Expected LTV: 500 / (100 * 10) = 0.5
      expect(ltv).toBe(0.5);
    });

    it("calculates account LTV correctly with multiple collaterals", () => {
      const accountTotalDebt = 1000;
      const collaterals = [
        createCollateral(100, 10, 0.8, 0.8),
        createCollateral(200, 5, 0.5, 0.5),
        createCollateral(50, 20, 0.2, 0.2),
      ];

      const ltv = calculateAccountLTV(accountTotalDebt, collaterals);

      // Expected LTV: 1000 / (100 * 10 + 200 * 5 + 50 * 20) = 0.333
      expect(ltv).toBeCloseTo(0.333);
    });

    it("returns 0 when there are no collaterals", () => {
      const accountTotalDebt = 1000;
      const collaterals: Collateral[] = [];

      const ltv = calculateAccountLTV(accountTotalDebt, collaterals);

      expect(ltv).toBe(0);
    });
  });

  describe("calculateAccountMaxLTV", () => {
    it("calculates account max LTV correctly with a single collateral", () => {
      const collaterals = [createCollateral(100, 10, 0.7, 0.7)];

      const ltv = calculateAccountMaxLTV(collaterals);

      // Expected LTV: (100 * 10 * 0.7) / (100 * 10) = 0.7
      expect(ltv).toBe(0.7);
    });

    it("calculates account max LTV correctly with multiple collaterals", () => {
      const collaterals = [
        createCollateral(100, 10, 0.7, 0.7),
        createCollateral(12, 1, 0.4, 0.4),
        createCollateral(1200, 10, 0.6, 0.6),
      ];

      const ltv = calculateAccountMaxLTV(collaterals);
      expect(ltv).toBeCloseTo(0.6075);
    });
  });

  describe("calculateAccountLiqLTV", () => {
    it("calculates account liq LTV correctly with multiple collaterals", () => {
      const collaterals = [
        createCollateral(100, 10, 0.7, 0.9),
        createCollateral(12, 1, 0.4, 0.6),
        createCollateral(1200, 10, 0.6, 0.7),
      ];

      const liqLtv = calculateAccountLiqLTV(collaterals);
      expect(liqLtv).toBeCloseTo(0.715);
    });
  });

  describe("calculateLiquidationPoint", () => {
    it("calculate liquidation point", () => {
      const collaterals = [createCollateral(1000, 10, 0.8, 0.8)];
      const liqLtv = calculateAccountLiqLTV(collaterals);
      const irParams = {
        urKink: 0.8,
        baseIR: 0.15,
        slope1: 1.5,
        slope2: 7,
      };

      const lp = calculateLiquidationPoint(
        liqLtv,
        100, // debt shares
        1000, // open interest
        1000, // total debt shares
        10000, // total assets (10% utilization rate)
        irParams,
        1 // second
      );
      expect(lp).toBeCloseTo(125);
    });
  });

  describe("calculateDrop", () => {
    it("calculates drop correctly with single collateral", () => {
      const collaterals = [createCollateral(100, 10, 0.8, 0.8)];
      const currentDebt = 500;

      const drop = calculateDrop(collaterals, currentDebt);
      expect(drop).toBeCloseTo(0.375); // 1 - (500 / (100 * 10 * 0.8))
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
        "LiquidationLTV is not defined"
      );
    });
  });

  describe("calculateTotalCollateralValue", () => {
    it("calculates total value correctly with multiple collaterals", () => {
      const collaterals = [
        createCollateral(100, 10),
        createCollateral(200, 5),
        createCollateral(50, 20),
      ];

      const value = calculateTotalCollateralValue(collaterals);
      expect(value).toBe(3000); // (100 * 10) + (200 * 5) + (50 * 20)
    });

    it("returns 0 for empty collateral list", () => {
      expect(calculateTotalCollateralValue([])).toBe(0);
    });

    it("handles collaterals with zero amount or price", () => {
      const collaterals = [
        createCollateral(0, 10),
        createCollateral(100, 0),
        createCollateral(100, 10),
      ];

      const value = calculateTotalCollateralValue(collaterals);
      expect(value).toBe(1000);
    });
  });

  describe("calculateWeightedLTV", () => {
    it("calculates weighted LTV correctly", () => {
      const collaterals = [
        createCollateral(100, 10, 0.8, 0.9),
        createCollateral(200, 5, 0.7, 0.8),
      ];

      const weightedLTV = calculateWeightedLTV(collaterals);
      expect(weightedLTV).toBe(1700); // (100 * 10 * 0.9) + (200 * 5 * 0.8)
    });

    it("throws error for undefined liquidationLTV", () => {
      const collaterals = [
        {
          amount: 100,
          price: 10,
          maxLTV: 0.8,
        } as Collateral,
      ];

      expect(() => calculateWeightedLTV(collaterals)).toThrow(
        "LiquidationLTV is not defined"
      );
    });
  });

  describe("edge cases", () => {
    it("handles zero values in account health calculation", () => {
      const collaterals = [createCollateral(0, 10, 0.8, 0.8)];
      const health = calculateAccountHealth(collaterals, 1);
      expect(health).toBe(0);
    });

    it("handles undefined maxLTV in account max LTV calculation", () => {
      const collaterals = [
        {
          amount: 100,
          price: 10,
          liquidationLTV: 0.8,
        } as Collateral,
      ];

      expect(() => calculateAccountMaxLTV(collaterals)).toThrow(
        "MaxLTV is not defined for one or more collaterals"
      );
    });

    it("handles zero liquidation point when accountLiqLTV is zero", () => {
      const irParams = {
        urKink: 0.8,
        baseIR: 0.15,
        slope1: 1.5,
        slope2: 7,
      };

      const lp = calculateLiquidationPoint(
        0,
        100,
        1000,
        1000,
        10000,
        irParams,
        1
      );
      expect(lp).toBe(0);
    });
  });
});
