import {
  convertDebtAssetsToShares,
  calculateDrop,
  calculateWeightedLTV,
  protocolAvailableToBorrow,
  computeTotalEarning,
  liquidatorMaxRepayAmount,
  annualizedAPR,
} from "../src/functions";
import { InterestRateParams, Collateral } from "../src/types";
import { createCollateral } from "./utils";

describe("Missing Functions Unit Tests", () => {
  // Test convertDebtAssetsToShares edge cases
  describe("convertDebtAssetsToShares", () => {
    const irParams: InterestRateParams = {
      urKink: 0.8,
      baseIR: 0.03,
      slope1: 0.05,
      slope2: 0.75,
    };

    it("should return 0 when totalAssets is 0", () => {
      const result = convertDebtAssetsToShares(
        100, // debtAssets
        1000, // openInterest
        0, // totalDebtShares
        500, // totalAssets
        0.1, // protocolReservePercentage
        irParams,
        86400 // timeDelta (1 day)
      );
      expect(result).toBe(0);
    });

    it("should convert debt assets to shares with normal parameters", () => {
      const result = convertDebtAssetsToShares(
        1000, // debtAssets
        1000, // openInterest
        20000, // totalDebtShares
        10000, // totalAssets
        0.1, // protocolReservePercentage
        irParams,
        86400 // timeDelta (1 day)
      );
      expect(result).toBeGreaterThan(0);
    });
  });

  // Test calculateDrop
  describe("calculateDrop", () => {
    it("returns 0 when total collateral value is 0", () => {
      const drop = calculateDrop([], 1000);
      expect(drop).toBe(0);
    });

    it("calculates drop as 1 - (currentDebt / totalCollateralValue)", () => {
      const collaterals: Collateral[] = [
        createCollateral(100, 10, undefined, 0.8),
      ];
      const totalCollateralValue = 100 * 10 * 0.8; // 800 (including liquidationLTV)
      const currentDebt = 500;
      const expectedDrop = 1 - currentDebt / totalCollateralValue; // 0.375
      const drop = calculateDrop(collaterals, currentDebt);
      expect(drop).toBeCloseTo(expectedDrop);
    });
  });

  // Test calculateWeightedLTV
  describe("calculateWeightedLTV", () => {
    it("calculates weighted LTV correctly", () => {
      const collaterals: Collateral[] = [
        createCollateral(100, 10, undefined, 0.8),
        createCollateral(200, 5, undefined, 0.7),
      ];
      // Expected weighted LTV = (100*10*0.8) + (200*5*0.7) = 800 + 700 = 1500
      const weighted = calculateWeightedLTV(collaterals);
      expect(weighted).toBeCloseTo(1500);
    });

    it("throws error if any collateral is missing liquidationLTV", () => {
      const collaterals: Collateral[] = [
        { amount: 100, price: 10 } as Collateral, // missing liquidationLTV
      ];
      expect(() => calculateWeightedLTV(collaterals)).toThrow(
        "LiquidationLTV is not defined"
      );
    });
  });

  // Test protocolAvailableToBorrow
  describe("protocolAvailableToBorrow", () => {
    it("returns 0 if reserveBalance >= freeLiquidity", () => {
      const available = protocolAvailableToBorrow(100, 150);
      expect(available).toBe(0);
    });

    it("returns freeLiquidity - reserveBalance when freeLiquidity > reserveBalance", () => {
      const available = protocolAvailableToBorrow(100, 90);
      expect(available).toBeCloseTo(10);
    });
  });

  // Test computeTotalEarning
  describe("computeTotalEarning", () => {
    const irParams: InterestRateParams = {
      urKink: 0.8,
      baseIR: 0.03,
      slope1: 0.05,
      slope2: 0.75,
    };

    it("returns non-negative earnings", () => {
      const earning = computeTotalEarning(
        100, // shares
        1000, // totalShares
        2000, // totalAssets
        500, // openInterest
        0.1, // protocolReservePercentage
        irParams,
        100, // reserveBalance
        86400 // timeDelta (1 day)
      );
      expect(earning).toBeGreaterThanOrEqual(0);
    });

    it("returns 0 when computed earning is negative", () => {
      const earning = computeTotalEarning(
        100, // shares
        1000, // totalShares
        2000, // totalAssets
        500, // openInterest
        0.1, // protocolReservePercentage
        irParams,
        10000, // high reserveBalance to force negative result
        86400 // timeDelta (1 day)
      );
      expect(earning).toBe(0);
    });
  });

  // Test liquidatorMaxRepayAmount
  describe("liquidatorMaxRepayAmount", () => {
    const irParams: InterestRateParams = {
      urKink: 0.8,
      baseIR: 0.03,
      slope1: 0.05,
      slope2: 0.75,
    };
    const debtShares = 1000;
    const openInterest = 10000;
    const totalDebtShares = 10000;
    const totalAssets = 20000;
    const timeDelta = 2592000; // one month in seconds

    it("throws error if collateral is missing liquidationLTV or liquidationPremium", () => {
      const invalidCollateral = { amount: 100, price: 10 } as Collateral;
      expect(() =>
        liquidatorMaxRepayAmount(
          debtShares,
          openInterest,
          totalDebtShares,
          totalAssets,
          irParams,
          timeDelta,
          invalidCollateral
        )
      ).toThrow("Liquidation LTV or liquidation premium are not defined");
    });

    it("calculates liquidator max repay amount with valid collateral", () => {
      const validCollateral: Collateral = {
        amount: 100,
        price: 10,
        liquidationLTV: 0.8,
        liquidationPremium: 0.05,
      };
      const result = liquidatorMaxRepayAmount(
        debtShares,
        openInterest,
        totalDebtShares,
        totalAssets,
        irParams,
        timeDelta,
        validCollateral
      );
      expect(result).toBeGreaterThan(0);
    });
  });

  // Test annualizedAPR
  describe("annualizedAPR", () => {
    it("calculates APR correctly when utilization rate is below urKink", () => {
      const irParams: InterestRateParams = {
        urKink: 0.8,
        baseIR: 0.03,
        slope1: 0.05,
        slope2: 0.75,
      };
      const ur = 0.5; // below urKink
      const expectedAPR = irParams.slope1 * ur + irParams.baseIR; // 0.05*0.5 + 0.03 = 0.055
      const apr = annualizedAPR(ur, irParams);
      expect(apr).toBeCloseTo(expectedAPR);
    });

    it("calculates APR correctly when utilization rate is above urKink", () => {
      const irParams: InterestRateParams = {
        urKink: 0.8,
        baseIR: 0.03,
        slope1: 0.05,
        slope2: 0.75,
      };
      const ur = 0.9; // above urKink
      const expectedAPR =
        irParams.slope2 * (ur - irParams.urKink) +
        irParams.slope1 * irParams.urKink +
        irParams.baseIR;
      const apr = annualizedAPR(ur, irParams);
      expect(apr).toBeCloseTo(expectedAPR);
    });

    it("calculates APR correctly at exactly urKink", () => {
      const irParams: InterestRateParams = {
        urKink: 0.8,
        baseIR: 0.03,
        slope1: 0.05,
        slope2: 0.75,
      };
      const ur = 0.8; // exactly at urKink
      const expectedAPR = irParams.slope1 * ur + irParams.baseIR;
      const apr = annualizedAPR(ur, irParams);
      expect(apr).toBeCloseTo(expectedAPR);
    });
  });
});
