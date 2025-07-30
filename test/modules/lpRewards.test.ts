import { calculateLpRewardApy, estimatedRewards } from "../../src/modules/lpRewards";
import { secondsInAYear } from "../../src/constants";
import { Epoch } from "../../src/types";

describe("lpRewards module tests", () => {
  it("calculates total LP rewards correctly", () => {
    const result = estimatedRewards(10_000, 0.1, secondsInAYear);
    expect(result).toBe(1_000);
  });

  it("should calculate APR correctly for a year", () => {
    const epoch: Epoch = {
      startTimestamp: 1744302900,
      endTimestamp: 1744821300,
      totalRewards: 1260,
    };
    const apr = calculateLpRewardApy(500_000, 100, epoch);
    expect(apr).toBe(0.1533); // Still 15% APR when annualized
  });

  describe("calculateLpRewardApy error scenarios", () => {
    it("should throw error if userLpShares is zero", () => {
      const epoch: Epoch = {
        startTimestamp: 1000,
        endTimestamp: 2000,
        totalRewards: 100,
      };
      expect(() => calculateLpRewardApy(500_000, 0, epoch)).toThrow(
        "User LP shares amount must be positive",
      );
    });

    it("should throw error if userLpShares is negative", () => {
      const epoch: Epoch = {
        startTimestamp: 1000,
        endTimestamp: 2000,
        totalRewards: 100,
      };
      expect(() => calculateLpRewardApy(500_000, -50, epoch)).toThrow(
        "User LP shares amount must be positive",
      );
    });

    it("should throw error if deposit amount is zero", () => {
      expect(() => estimatedRewards(0, 0.1, secondsInAYear)).toThrow(
        "Deposit amount must be positive",
      );
    });

    it("should throw error if deposit amount is negative", () => {
      expect(() => estimatedRewards(-100, 0.1, secondsInAYear)).toThrow(
        "Deposit amount must be positive",
      );
    });

    it("should throw error if apr is negative", () => {
      expect(() => estimatedRewards(10_000, -0.1, secondsInAYear)).toThrow(
        "APR cannot be negative",
      );
    });

    it("should throw error if duration is zero", () => {
      expect(() => estimatedRewards(10_000, 0.1, 0)).toThrow(
        "Duration must be positive",
      );
    });

    it("should throw error if duration is negative", () => {
      expect(() => estimatedRewards(10_000, 0.1, -1000)).toThrow(
        "Duration must be positive",
      );
    });
  });
});
