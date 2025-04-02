import {
  calculateAccountHealth,
  calculateAccountLTV,
  calculateAccountMaxLTV,
  calculateAccountLiqLTV,
  calculateLiquidationPoint,
  calculateDrop,
  calculateTotalCollateralValue,
  calculateMaxWithdrawAmount,
  Collateral,
} from "../../src";
import { createCollateral } from "../utils";

describe("Account Module", () => {
  describe("Account Health", () => {
    it("calculates account health correctly with single collateral", () => {
      const collaterals = [createCollateral(100, 10, 0.8, 0.8)];
      const currentDebt = 500;

      const health = calculateAccountHealth(collaterals, currentDebt);
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
      expect(health).toBe(2.4);
    });

    it("returns error when debt is zero", () => {
      const collaterals = [createCollateral(100, 10, 0.8, 0.8)];
      const currentDebt = 0;

      expect(() => calculateAccountHealth(collaterals, currentDebt)).toThrow(
        "Current debt cannot be zero",
      );
    });

    it("returns zero when no collaterals are provided", () => {
      const collaterals: Collateral[] = [];
      const currentDebt = 1000;

      const health = calculateAccountHealth(collaterals, currentDebt);
      expect(health).toBe(0);
    });

    it("throws error for undefined liquidationLTV", () => {
      const collaterals = [
        {
          amount: 100,
          price: 10,
          maxLTV: 0.8,
        } as Collateral,
      ];
      const currentDebt = 500;

      expect(() => calculateAccountHealth(collaterals, currentDebt)).toThrow(
        "LiquidationLTV is not defined",
      );
    });
  });

  describe("Total Collateral Value", () => {
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

  describe("Account LTV", () => {
    it("calculates account LTV correctly with single collateral", () => {
      const accountTotalDebt = 500;
      const collaterals = [createCollateral(100, 10, 0.7, 0.7)];

      const ltv = calculateAccountLTV(accountTotalDebt, collaterals);
      expect(ltv).toBe(0.5); // 500 / (100 * 10)
    });

    it("calculates account LTV correctly with multiple collaterals", () => {
      const accountTotalDebt = 1000;
      const collaterals = [
        createCollateral(100, 10, 0.8, 0.8),
        createCollateral(200, 5, 0.5, 0.5),
        createCollateral(50, 20, 0.2, 0.2),
      ];

      const ltv = calculateAccountLTV(accountTotalDebt, collaterals);
      expect(ltv).toBeCloseTo(0.333);
    });

    it("returns 0 when there are no collaterals", () => {
      const accountTotalDebt = 1000;
      const collaterals: Collateral[] = [];

      const ltv = calculateAccountLTV(accountTotalDebt, collaterals);
      expect(ltv).toBe(0);
    });
  });

  describe("Account Max LTV", () => {
    it("calculates account max LTV correctly with a single collateral", () => {
      const collaterals = [createCollateral(100, 10, 0.7, 0.7)];

      const ltv = calculateAccountMaxLTV(collaterals);
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

    it("returns 0 when there are no collaterals", () => {
      const collaterals: Collateral[] = [];
      const ltv = calculateAccountMaxLTV(collaterals);
      expect(ltv).toBe(0);
    });

    it("throws error for undefined maxLTV", () => {
      const collaterals = [
        {
          amount: 100,
          price: 10,
          liquidationLTV: 0.8,
        } as Collateral,
      ];

      expect(() => calculateAccountMaxLTV(collaterals)).toThrow(
        "MaxLTV is not defined for one or more collaterals",
      );
    });
  });

  describe("Account Liquidation LTV", () => {
    it("calculates account liq LTV correctly with multiple collaterals", () => {
      const collaterals = [
        createCollateral(100, 10, 0.7, 0.9),
        createCollateral(12, 1, 0.4, 0.6),
        createCollateral(1200, 10, 0.6, 0.7),
      ];

      const liqLtv = calculateAccountLiqLTV(collaterals);
      expect(liqLtv).toBeCloseTo(0.715);
    });

    it("returns 0 when there are no collaterals", () => {
      const collaterals: Collateral[] = [];
      const liqLtv = calculateAccountLiqLTV(collaterals);
      expect(liqLtv).toBe(0);
    });

    it("throws error for undefined liquidationLTV", () => {
      const collaterals = [
        {
          amount: 100,
          price: 10,
          maxLTV: 0.8,
        } as Collateral,
      ];

      expect(() => calculateAccountLiqLTV(collaterals)).toThrow(
        "LiquidationLTV is not defined",
      );
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
        1, // second
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
        "LiquidationLTV is not defined",
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
        "MaxLTV is not defined for one or more collaterals",
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
        1,
      );
      expect(lp).toBe(0);
    });
  });

  describe("calculateMaxWithdrawAmount", () => {
    const defaultIrParams = {
      urKink: 0.8,
      baseIR: 0.01,
      slope1: 0.1,
      slope2: 1.0,
    };

    it("returns full amount when there is no debt", () => {
      const collateralToWithdraw = createCollateral(100, 10, 0.8, 0.8);
      const allCollaterals = [collateralToWithdraw];

      const maxWithdraw = calculateMaxWithdrawAmount(
        collateralToWithdraw,
        allCollaterals,
        0, // no debt shares
        1000, // open interest
        1000, // total debt shares
        10000, // total assets
        defaultIrParams,
        3600, // 1 hour time delta
        18, // decimals
      );

      expect(maxWithdraw).toBe(100);
    });

    it("handles decimal precision correctly", () => {
      const collateralToWithdraw = createCollateral(100, 10, 0.8, 0.8);
      const allCollaterals = [collateralToWithdraw];

      const maxWithdraw = calculateMaxWithdrawAmount(
        collateralToWithdraw,
        allCollaterals,
        500, // debt shares
        1000, // open interest
        1000, // total debt shares
        10000, // total assets
        defaultIrParams,
        3600, // 1 hour time delta
        18, // decimals
      );

      // Should be properly rounded to 18 decimals
      expect(maxWithdraw.toString()).not.toContain("999999999999999999");
    });

    it("returns 0 when no withdrawal is possible due to high debt", () => {
      const collateralToWithdraw = createCollateral(100, 10, 0.8, 0.8);
      const allCollaterals = [collateralToWithdraw];

      const maxWithdraw = calculateMaxWithdrawAmount(
        collateralToWithdraw,
        allCollaterals,
        1000, // high debt shares
        1000, // open interest
        1000, // total debt shares
        1000, // total assets
        defaultIrParams,
        3600,
        18,
      );

      expect(maxWithdraw).toBe(0);
    });

    it("handles multiple collaterals correctly", () => {
      const collateralToWithdraw = createCollateral(100, 10, 0.8, 0.8); // Value: 1000
      const otherCollateral = createCollateral(200, 5, 0.7, 0.7); // Value: 1000
      const allCollaterals = [collateralToWithdraw, otherCollateral];

      const maxWithdraw = calculateMaxWithdrawAmount(
        collateralToWithdraw,
        allCollaterals,
        500, // debt shares
        1000,
        1000,
        10000,
        defaultIrParams,
        3600,
        18,
      );

      expect(maxWithdraw).toBeGreaterThan(0);
      expect(maxWithdraw).toBeLessThanOrEqual(100);
    });

    it("respects maxLTV when calculating withdrawal amount", () => {
      const collateralToWithdraw = createCollateral(100, 10, 0.5, 0.5); // Lower maxLTV
      const allCollaterals = [collateralToWithdraw];

      const maxWithdraw = calculateMaxWithdrawAmount(
        collateralToWithdraw,
        allCollaterals,
        300, // debt shares
        1000,
        1000,
        10000,
        defaultIrParams,
        3600,
        18,
      );

      // Should allow less withdrawal due to lower maxLTV
      expect(maxWithdraw).toBeLessThan(50);
    });

    it("handles future debt calculation correctly", () => {
      const collateralToWithdraw = createCollateral(100, 10, 0.8, 0.8);
      const allCollaterals = [collateralToWithdraw];

      const maxWithdrawNow = calculateMaxWithdrawAmount(
        collateralToWithdraw,
        allCollaterals,
        500,
        1000,
        1000,
        10000,
        defaultIrParams,
        0, // current time
        18,
      );

      const maxWithdrawFuture = calculateMaxWithdrawAmount(
        collateralToWithdraw,
        allCollaterals,
        500,
        1000,
        1000,
        10000,
        defaultIrParams,
        3600 * 24, // 24 hours later
        18,
      );

      // Future withdrawal should be less due to accrued interest
      expect(maxWithdrawFuture).toBeLessThan(maxWithdrawNow);
    });

    it("uses the custom futureDeltaSeconds parameter correctly", () => {
      const collateralToWithdraw = createCollateral(100, 10, 0.8, 0.8);
      const allCollaterals = [collateralToWithdraw];

      // With default 600 seconds (10 minutes)
      const defaultFuture = calculateMaxWithdrawAmount(
        collateralToWithdraw,
        allCollaterals,
        500,
        1000,
        1000,
        10000,
        defaultIrParams,
        3600,
        18,
      );

      // With shorter future window (60 seconds)
      const shortFuture = calculateMaxWithdrawAmount(
        collateralToWithdraw,
        allCollaterals,
        500,
        1000,
        1000,
        10000,
        defaultIrParams,
        3600,
        18,
        60, // 1 minute instead of 10
      );

      // With longer future window (3600 seconds)
      const longFuture = calculateMaxWithdrawAmount(
        collateralToWithdraw,
        allCollaterals,
        500,
        1000,
        1000,
        10000,
        defaultIrParams,
        3600,
        18,
        3600, // 1 hour instead of 10 minutes
      );

      // Shorter future window should allow more withdrawal
      expect(shortFuture).toBeGreaterThan(defaultFuture);

      // Longer future window should allow less withdrawal
      expect(longFuture).toBeLessThan(defaultFuture);
    });

    it("throws error if maxLTV is not defined", () => {
      const collateralToWithdraw = {
        amount: 100,
        price: 10,
        liquidationLTV: 0.8,
      } as Collateral;
      const allCollaterals = [collateralToWithdraw];

      expect(() =>
        calculateMaxWithdrawAmount(
          collateralToWithdraw,
          allCollaterals,
          500,
          1000,
          1000,
          10000,
          defaultIrParams,
          3600,
          18,
        ),
      ).toThrow("MaxLTV is not defined");
    });

    it("handles different decimal precisions", () => {
      const collateralToWithdraw = createCollateral(100, 10, 0.8, 0.8);
      const allCollaterals = [collateralToWithdraw];

      const maxWithdraw6Dec = calculateMaxWithdrawAmount(
        collateralToWithdraw,
        allCollaterals,
        500,
        1000,
        1000,
        10000,
        defaultIrParams,
        3600,
        6, // 6 decimals
      );

      const maxWithdraw18Dec = calculateMaxWithdrawAmount(
        collateralToWithdraw,
        allCollaterals,
        500,
        1000,
        1000,
        10000,
        defaultIrParams,
        3600,
        18, // 18 decimals
      );

      // Both should be valid numbers with appropriate precision
      expect(
        maxWithdraw6Dec.toString().split(".")[1]?.length || 0,
      ).toBeLessThanOrEqual(6);
      expect(
        maxWithdraw18Dec.toString().split(".")[1]?.length || 0,
      ).toBeLessThanOrEqual(18);
    });
  });
});
