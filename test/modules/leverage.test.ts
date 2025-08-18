import {
  absoluteMaxLeverage,
  correctedMaxLTV,
  unencumberedCollateral,
  leverageMaxSlippage,
  swapLoss,
  computeFlashLoanValues,
  convertDebtSharesToAssets,
  InterestRateParams,
} from "../../src";
import { createCollateral } from "../utils";

describe("Leverage module tests", () => {
  const defaultIrParams: InterestRateParams = {
    urKink: 0.7,
    baseIR: 0.5,
    slope1: 0.75,
    slope2: 1.5,
  };

  describe("absoluteMaxLeverage", () => {
    it("computes 1 over 1 minus maxLTV", () => {
      const collateral = createCollateral(100, 10, 0.7, 0.7);
      expect(absoluteMaxLeverage(collateral)).toBeCloseTo(1 / (1 - 0.7));
    });

    it("throws when maxLTV is missing", () => {
      const badCollateral = { amount: 100, price: 1 } as any;
      expect(() => absoluteMaxLeverage(badCollateral)).toThrow(
        "Invalid maxLTV",
      );
    });
  });

  describe("correctedMaxLTV", () => {
    it("returns zero when fees consume the entire LTV", () => {
      const collateral = createCollateral(100, 10, 0.7, 0.7);
      const result = correctedMaxLTV(collateral, 1, 0);
      expect(result).toBe(0);
    });

    it("applies fees and slippage to maxLTV", () => {
      const collateral = createCollateral(100, 1, 0.8, 0.8);
      const result = correctedMaxLTV(collateral, 0.01, 0.02);
      expect(result).toBeCloseTo((1 - 0.01 - 0.02) * 0.8);
    });

    it("throws when maxLTV is missing", () => {
      const badCollateral = { amount: 100, price: 1 } as any;
      expect(() => correctedMaxLTV(badCollateral, 0.01, 0.01)).toThrow(
        "Invalid maxLTV",
      );
    });
  });

  describe("unencumberedCollateral", () => {
    it("equals total collateral value when debt shares are zero", () => {
      const collateral = createCollateral(100, 2, 0.5, 0.5);
      const result = unencumberedCollateral(
        0, // debtShares
        10_000, // openInterest
        10_000, // totalDebtShares
        20_000, // totalAssets
        defaultIrParams,
        3600, // timeDelta
        collateral,
        0.7, // maxLTVcorrected
      );
      expect(result).toBeCloseTo(100 * 2);
    });

    it("becomes negative when debt is above the max LTV limit", () => {
      const collateral = createCollateral(200, 1, 0.6, 0.6);

      const result = unencumberedCollateral(
        1_000,
        20_000,
        10_000,
        40_000,
        defaultIrParams,
        7200,
        collateral,
        0.6, // maxLTVcorrected
      );

      expect(result).toBeLessThan(0);
    });

    it("is zero at the boundary when debt equals collateral value times maxLTV", () => {
      // Remove time accrual so the share to asset ratio is exact
      // openInterest divided by totalDebtShares equals 2 assets per share
      // Need 120 assets of debt to hit the boundary which equals 60 shares
      const collateral = createCollateral(200, 1, 0.6, 0.6);

      const result = unencumberedCollateral(
        60,
        20_000,
        10_000,
        40_000,
        defaultIrParams,
        0, // no accrual
        collateral,
        0.6, // maxLTVcorrected
      );

      expect(result).toBeCloseTo(0, 10);
    });

    it("matches manual computation using convertDebtSharesToAssets", () => {
      const collateral = createCollateral(100, 2, 0.5, 0.5); // total value 200
      const debtShares = 1_000;
      const openInterest = 10_000;
      const totalDebtShares = 10_000;
      const totalAssets = 20_000;
      const timeDelta = 3600;

      const debtAssets = convertDebtSharesToAssets(
        debtShares,
        openInterest,
        totalDebtShares,
        totalAssets,
        defaultIrParams,
        timeDelta,
      );
      const expected = 200 - debtAssets / (collateral.maxLTV as number);

      const result = unencumberedCollateral(
        debtShares,
        openInterest,
        totalDebtShares,
        totalAssets,
        defaultIrParams,
        timeDelta,
        collateral,
        collateral.maxLTV as number, // pass through unchanged when comparing to old formula
      );

      expect(result).toBeCloseTo(expected);
    });

    it("is lower with higher utilization or longer time", () => {
      const collateral = createCollateral(150, 1, 0.6, 0.6);
      const base = unencumberedCollateral(
        1_000,
        10_000, // lower utilization
        10_000,
        100_000, // assets large
        defaultIrParams,
        3600,
        collateral,
        0.6,
      );
      const higherUtil = unencumberedCollateral(
        1_000,
        80_000, // higher utilization
        10_000,
        100_000,
        defaultIrParams,
        3600,
        collateral,
        0.6,
      );
      const longerTime = unencumberedCollateral(
        1_000,
        10_000,
        10_000,
        100_000,
        defaultIrParams,
        21_600, // longer time
        collateral,
        0.6,
      );

      expect(higherUtil).toBeLessThan(base);
      expect(longerTime).toBeLessThan(base);
    });
  });
});

describe("leverageMaxSlippage", () => {
  it("is zero when slippage is zero", () => {
    expect(leverageMaxSlippage(100, 3, 0)).toBe(0);
  });

  it("grows with target leverage and slippage", () => {
    const low = leverageMaxSlippage(100, 2, 0.01);
    const highLev = leverageMaxSlippage(100, 4, 0.01);
    const highSlip = leverageMaxSlippage(100, 2, 0.03);

    expect(highLev).toBeGreaterThan(low);
    expect(highSlip).toBeGreaterThan(low);
  });

  it("matches closed form s over 1 minus s times new collateral value", () => {
    const unencVal = 250;
    const lev = 3;
    const s = 0.02;
    const newCollateralValue = unencVal * (lev - 1);
    const expected = newCollateralValue * (s / (1 - s));
    expect(leverageMaxSlippage(unencVal, lev, s)).toBeCloseTo(expected);
  });
});

describe("swapLoss", () => {
  it("computes flash loan minus received value", () => {
    const result = swapLoss(1000, 9, 100, 90);
    // received value equals 9 * 100 / 90 equals 10
    // swap loss equals 1000 minus 10 equals 990
    expect(result).toBeCloseTo(990);
  });
});

describe("computeFlashLoanValues", () => {
  it("derives flash loan notional and implied slippage", () => {
    const newCollateralValue = 1000;
    const loss = 25;
    const { flashLoanValue, slippage } = computeFlashLoanValues(
      newCollateralValue,
      loss,
    );
    expect(flashLoanValue).toBeCloseTo(1025);
    expect(slippage).toBeCloseTo(25 / 1025);
  });

  it("handles zero loss", () => {
    const { flashLoanValue, slippage } = computeFlashLoanValues(500, 0);
    expect(flashLoanValue).toBe(500);
    expect(slippage).toBe(0);
  });
});
