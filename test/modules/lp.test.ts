import {
  convertLpAssetsToShares,
  convertLpSharesToAssets,
  calculateLpAPY,
  computeTotalEarning,
  InterestRateParams,
} from "../../src";

describe("LP Module", () => {
  const irParams: InterestRateParams = {
    urKink: 0.7,
    baseIR: 0.5,
    slope1: 0.75,
    slope2: 1.5,
  };

  describe("LP Share Conversions", () => {
    it("handles zero total assets", () => {
      expect(convertLpAssetsToShares(100, 8000, 0, 0, 0, irParams, 0)).toBe(0);
    });

    it("handles zero total shares", () => {
      expect(convertLpSharesToAssets(100, 0, 10000, 0, 0, irParams, 0)).toBe(0);
    });

    it("convertLpAssetsToShares with standard values", () => {
      expect(convertLpAssetsToShares(100, 8000, 10000, 0, 0, irParams, 0)).toBe(
        80,
      );
    });

    it("convertLpAssetsToShares with interest accrual", () => {
      // LP share value increases
      expect(
        convertLpAssetsToShares(100, 8000, 10000, 1000, 0, irParams, 6000),
      ).toBeLessThan(80);
    });

    it("convertLpSharesToAssets reflects interest accrual", () => {
      // LP assets should have increased in number
      expect(
        convertLpSharesToAssets(80, 8000, 10000, 1000, 0, irParams, 6000),
      ).toBeGreaterThan(80);
    });

    it("handles protocol reserve percentage", () => {
      const withReserve = convertLpAssetsToShares(
        100,
        8000,
        10000,
        1000,
        0.1,
        irParams,
        6000,
      );
      const withoutReserve = convertLpAssetsToShares(
        100,
        8000,
        10000,
        1000,
        0,
        irParams,
        6000,
      );
      expect(withReserve).toBeGreaterThan(withoutReserve);
    });
  });

  describe("APY Calculations", () => {
    const irParams: InterestRateParams = {
      urKink: 0.8,
      baseIR: 0.02,
      slope1: 0.1,
      slope2: 0.2,
    };

    it("returns 0 for LP APY if utilization rate is 0", () => {
      const ur = 0;
      const protocolReservePercentage = 0.1;

      const result = calculateLpAPY(ur, irParams, protocolReservePercentage);
      expect(result).toBe(0);
    });

    it("calculates APY correctly for high utilization rate without rewards", () => {
      const utilizationRate = 0.9;
      const protocolReservePercentage = 0;
      const result = calculateLpAPY(
        utilizationRate,
        irParams,
        protocolReservePercentage,
      );
      expect(result).toBeGreaterThan(0);
    });

    it("calculates APY correctly at kink point", () => {
      const result = calculateLpAPY(irParams.urKink, irParams, 0);
      expect(result).toBeGreaterThan(0);
    });

    it("handles protocol reserve percentage in APY calculation", () => {
      const withReserve = calculateLpAPY(0.5, irParams, 0.1);
      const withoutReserve = calculateLpAPY(0.5, irParams, 0);
      expect(withReserve).toBeLessThan(withoutReserve);
    });
  });

  describe("Total Earning Calculations", () => {
    it("returns 0 when computed earning is less than reserve balance", () => {
      const result = computeTotalEarning(
        1000, // shares
        10000, // totalShares
        10000, // totalAssets
        1000, // openInterest
        0.1, // protocolReservePercentage
        irParams,
        2000, // reserveBalance
        6000, // timeDelta
      );
      expect(result).toBe(0);
    });

    it("calculates positive earnings correctly", () => {
      const result = computeTotalEarning(
        1000,
        10000,
        10000,
        5000,
        0.1,
        irParams,
        500,
        6000,
      );
      expect(result).toBeGreaterThan(0);
    });

    it("handles zero shares", () => {
      const result = computeTotalEarning(
        0,
        10000,
        10000,
        1000,
        0.1,
        irParams,
        100,
        6000,
      );
      expect(result).toBe(0);
    });
  });
});
