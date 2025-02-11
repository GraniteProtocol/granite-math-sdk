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
        "LiquidationLTV is not defined"
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
        1 // second
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
        1
      );
      expect(lp).toBe(0);
    });
  });

  describe("Liquidator Max Repay Calculations", () => {
    it("calculates max repay amount correctly", () => {
      const collateral: Collateral = {
        liquidationPremium: 0.01,
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
        1000,
        10000,
        100000,
        defaultIrParams,
        3600,
        collateral
      );

      const highUtilization = liquidatorMaxRepayAmount(
        10000,
        80000,
        10000,
        100000,
        defaultIrParams,
        3600,
        collateral
      );

      expect(highUtilization).toBeGreaterThan(lowUtilization);
    });
  });
});
