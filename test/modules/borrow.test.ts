import {
  computeUtilizationRate,
  calculateDueInterest,
  compoundedInterest,
  calculateBorrowAPY,
  userAvailableToBorrow,
  calculateMaxRepayAmount,
  annualizedAPR,
  protocolAvailableToBorrow,
  calculateBorrowCapacity,
  InterestRateParams,
} from "../../src";
import { createCollateral } from "../utils";

describe("Borrow Module", () => {
  const defaultIrParams: InterestRateParams = {
    urKink: 0.7,
    baseIR: 0.5,
    slope1: 0.75,
    slope2: 1.5,
  };

  describe("Utilization Rate", () => {
    it("calculates standard utilization rate", () => {
      expect(computeUtilizationRate(10, 100)).toBe(0.1);
      expect(computeUtilizationRate(101, 100)).toBe(1.01);
    });

    it("handles zero total assets", () => {
      expect(computeUtilizationRate(10, 0)).toBe(0);
    });

    it("handles zero open interest", () => {
      expect(computeUtilizationRate(0, 100)).toBe(0);
    });
  });

  describe("Interest Calculations", () => {
    it("calculates due interest correctly", () => {
      expect(
        calculateDueInterest(1, 500, 500, defaultIrParams, 6000)
      ).toBeCloseTo(1.0002853);
    });

    it("calculates compounded interest correctly", () => {
      const interest = compoundedInterest(1, 500, 500, defaultIrParams, 6000);
      const principal = calculateDueInterest(
        1,
        500,
        500,
        defaultIrParams,
        6000
      );
      expect(principal - interest).toBe(1);
    });

    it("handles zero time delta", () => {
      expect(compoundedInterest(1000, 500, 500, defaultIrParams, 0)).toBe(0);
    });

    it("handles zero debt amount", () => {
      expect(compoundedInterest(0, 500, 500, defaultIrParams, 6000)).toBe(0);
    });
  });

  describe("APR and APY Calculations", () => {
    it("calculates annualized APR below kink", () => {
      const ur = 0.5; // Below kink of 0.7
      const apr = annualizedAPR(ur, defaultIrParams);
      expect(apr).toBe(defaultIrParams.baseIR + defaultIrParams.slope1 * ur);
    });

    it("calculates annualized APR above kink", () => {
      const ur = 0.8; // Above kink of 0.7
      const apr = annualizedAPR(ur, defaultIrParams);
      const expectedApr =
        defaultIrParams.slope2 * (ur - defaultIrParams.urKink) +
        defaultIrParams.slope1 * defaultIrParams.urKink +
        defaultIrParams.baseIR;
      expect(apr).toBe(expectedApr);
    });

    it("calculates annualized APR at kink point", () => {
      const ur = defaultIrParams.urKink;
      const apr = annualizedAPR(ur, defaultIrParams);
      expect(apr).toBe(defaultIrParams.baseIR + defaultIrParams.slope1 * ur);
    });

    it("calculates borrow APY from base rate", () => {
      const ur = 0;
      const result = calculateBorrowAPY(ur, defaultIrParams);
      expect(result).toBeGreaterThan(defaultIrParams.baseIR);
    });
  });

  describe("Borrow Capacity and Availability", () => {
    it("calculates borrow capacity correctly", () => {
      const collaterals = [createCollateral(100, 1, 0.5)];
      expect(calculateBorrowCapacity(collaterals)).toBe(50);
    });

    it("throws error for undefined maxLTV", () => {
      const collaterals = [
        {
          amount: 100,
          price: 1,
        },
      ];
      expect(() => calculateBorrowCapacity(collaterals)).toThrow(
        "Collateral max LTV is not defined"
      );
    });

    it("handles empty collateral list", () => {
      expect(calculateBorrowCapacity([])).toBe(0);
    });

    it("calculates protocol available to borrow", () => {
      expect(protocolAvailableToBorrow(100, 20)).toBe(80);
      expect(protocolAvailableToBorrow(100, 100)).toBe(0);
      expect(protocolAvailableToBorrow(100, 120)).toBe(0);
    });

    it("userAvailableToBorrow takes into account current debt", () => {
      const collaterals = [createCollateral(100, 1, 0.5)];
      const freeLiquidity = 100;
      expect(userAvailableToBorrow(collaterals, freeLiquidity, 0, 40)).toBe(10);
    });

    it("userAvailableToBorrow is capped by free liquidity", () => {
      const collaterals = [createCollateral(100, 1, 0.5)];
      const freeLiquidity = 9;
      const reserveBalance = 1;

      const result = userAvailableToBorrow(
        collaterals,
        freeLiquidity,
        reserveBalance,
        40
      );
      expect(result).toBe(8);
    });
  });

  describe("Max Repay Calculations", () => {
    it("calculates max repay correctly", () => {
      const result = calculateMaxRepayAmount(
        1000, // debtShares
        10000, // openInterest
        10000, // totalDebtShares
        20000, // totalAssets
        defaultIrParams,
        2592000 // seconds in one month
      );
      expect(result).toBeCloseTo(1074.596, 3);
    });

    it("handles zero debt shares", () => {
      const result = calculateMaxRepayAmount(
        0,
        10000,
        10000,
        20000,
        defaultIrParams,
        2592000
      );
      expect(result).toBe(0);
    });

    it("handles zero total debt shares", () => {
      const result = calculateMaxRepayAmount(
        1000,
        10000,
        0,
        20000,
        defaultIrParams,
        2592000
      );
      expect(result).toBe(0);
    });
  });
});
