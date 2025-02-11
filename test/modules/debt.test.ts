import {
  convertDebtAssetsToShares,
  convertDebtSharesToAssets,
} from "../../src";

describe("Debt Module", () => {
  const defaultIrParams = {
    urKink: 0.7,
    baseIR: 0.5,
    slope1: 0.75,
    slope2: 1.5,
  };

  describe("convertDebtAssetsToShares", () => {
    it("converts debt assets to shares correctly", () => {
      const result = convertDebtAssetsToShares(
        1000, // debtAssets
        10000, // totalDebtShares
        20000, // totalAssets
        10000, // openInterest
        0.1, // protocolReservePercentage
        defaultIrParams,
        3600 // 1 hour
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
        3600
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
        3600
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
        3600
      );

      const withoutReserve = convertDebtAssetsToShares(
        1000,
        10000,
        20000,
        10000,
        0,
        defaultIrParams,
        3600
      );

      expect(withReserve).toBeGreaterThan(withoutReserve);
    });

    it("handles zero time delta", () => {
      const result = convertDebtAssetsToShares(
        1000,
        10000,
        20000,
        10000,
        0.1,
        defaultIrParams,
        0
      );
      expect(result).toBeCloseTo(1000);
    });
  });

  describe("convertDebtSharesToAssets", () => {
    it("converts debt shares to assets correctly", () => {
      const result = convertDebtSharesToAssets(
        1000, // debtShares
        10000, // openInterest
        10000, // totalDebtShares
        20000, // totalAssets
        defaultIrParams,
        3600 // 1 hour
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
        3600
      );
      expect(result).toBe(0);
    });

    it("handles zero debt shares", () => {
      const result = convertDebtSharesToAssets(
        0,
        10000,
        10000,
        20000,
        defaultIrParams,
        3600
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
        3600
      );

      const highUtilization = convertDebtSharesToAssets(
        1000,
        80000, // openInterest
        10000,
        100000, // totalAssets (80% utilization)
        defaultIrParams,
        3600
      );

      expect(highUtilization).toBeGreaterThan(lowUtilization);
    });

    it("handles zero time delta", () => {
      const result = convertDebtSharesToAssets(
        1000,
        10000,
        10000,
        20000,
        defaultIrParams,
        0
      );
      expect(result).toBe(1000);
    });

    it("maintains conversion relationship with convertDebtAssetsToShares", () => {
      const initialAssets = 1000;
      const shares = convertDebtAssetsToShares(
        initialAssets,
        10000,
        20000,
        10000,
        0,
        defaultIrParams,
        3600
      );
      const finalAssets = convertDebtSharesToAssets(
        shares,
        10000,
        10000,
        20000,
        defaultIrParams,
        3600
      );
      expect(finalAssets).toBeCloseTo(initialAssets);
    });
  });
});
