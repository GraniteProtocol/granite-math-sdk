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
  convertDebtAssetsToShares,
  convertDebtSharesToAssets,
  InterestRateParams,
} from "../../src";
import { createCollateral } from "../utils";

describe("Borrow and Debt Module", () => {
  const defaultIrParams: InterestRateParams = {
    urKink: 0.7,
    baseIR: 0.5,
    slope1: 0.75,
    slope2: 1.5,
  };

  // -------------- Utilization Rate Tests --------------

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

  // -------------- Interest Calculations Tests --------------

  describe("Interest Calculations", () => {
    it("calculates due interest correctly", () => {
      expect(
        calculateDueInterest(1, 500, 500, defaultIrParams, 6000),
      ).toBeCloseTo(1.0002853);
    });

    it("calculates compounded interest correctly", () => {
      const interest = compoundedInterest(1, 500, 500, defaultIrParams, 6000);
      const principal = calculateDueInterest(
        1,
        500,
        500,
        defaultIrParams,
        6000,
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

  // -------------- APR and APY Tests --------------

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

  // -------------- Debt Share Conversion Tests --------------

  describe("Debt Share Conversions", () => {
    it("converts debt assets to shares correctly", () => {
      const result = convertDebtAssetsToShares(
        1000, // debtAssets
        10000, // totalDebtShares
        20000, // totalAssets
        10000, // openInterest
        0.1, // protocolReservePercentage
        defaultIrParams,
        3600, // 1 hour
      );
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1000); // Should be less due to interest accrual
    });

    it("returns 0 when total assets is 0", () => {
      const result = convertDebtAssetsToShares(
        1000,
        10000,
        0, // totalAssets = 0
        10000,
        0.1,
        defaultIrParams,
        3600,
      );
      expect(result).toBe(0);
    });

    it("handles zero debt assets", () => {
      const result = convertDebtAssetsToShares(
        0,
        10000,
        20000,
        10000,
        0.1,
        defaultIrParams,
        3600,
      );
      expect(result).toBe(0);
    });

    it("handles different protocol reserve percentages", () => {
      const withReserve = convertDebtAssetsToShares(
        1000,
        10000,
        20000,
        10000,
        0.1,
        defaultIrParams,
        3600,
      );

      const withoutReserve = convertDebtAssetsToShares(
        1000,
        10000,
        20000,
        10000,
        0,
        defaultIrParams,
        3600,
      );

      expect(withReserve).toBeGreaterThan(withoutReserve);
    });

    it("converts debt shares to assets correctly", () => {
      const result = convertDebtSharesToAssets(
        1000, // debtShares
        10000, // openInterest
        10000, // totalDebtShares
        20000, // totalAssets
        defaultIrParams,
        3600, // 1 hour
      );
      expect(result).toBeGreaterThan(1000); // Should be more due to interest accrual
    });

    it("returns 0 when total debt shares is 0", () => {
      const result = convertDebtSharesToAssets(
        1000,
        10000,
        0, // totalDebtShares = 0
        20000,
        defaultIrParams,
        3600,
      );
      expect(result).toBe(0);
    });

    it("handles different utilization rates", () => {
      const lowUtilization = convertDebtSharesToAssets(
        1000,
        1000, // openInterest
        10000,
        100000, // totalAssets (1% utilization)
        defaultIrParams,
        3600,
      );

      const highUtilization = convertDebtSharesToAssets(
        1000,
        80000, // openInterest
        10000,
        100000, // totalAssets (80% utilization)
        defaultIrParams,
        3600,
      );

      expect(highUtilization).toBeGreaterThan(lowUtilization);
    });

    it("maintains conversion relationship", () => {
      const initialAssets = 1000;
      const shares = convertDebtAssetsToShares(
        initialAssets,
        10000,
        20000,
        10000,
        0,
        defaultIrParams,
        3600,
      );
      const finalAssets = convertDebtSharesToAssets(
        shares,
        10000,
        10000,
        20000,
        defaultIrParams,
        3600,
      );
      expect(finalAssets).toBeCloseTo(initialAssets);
    });
  });

  // -------------- Borrow Capacity and Availability Tests --------------

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
        "Collateral max LTV is not defined",
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
        40,
      );
      expect(result).toBe(8);
    });
  });

  // -------------- Repayment Calculations Tests --------------

  describe("Max Repay Calculations", () => {
    it("calculates max repay correctly", () => {
      const result = calculateMaxRepayAmount(
        1000, // debtShares
        10000, // openInterest
        10000, // totalDebtShares
        20000, // totalAssets
        defaultIrParams,
        2592000, // seconds in one month
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
        2592000,
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
        2592000,
      );
      expect(result).toBe(0);
    });
  });
});
