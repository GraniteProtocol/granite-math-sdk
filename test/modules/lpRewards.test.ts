import {
  calculateApr,
  earnedRewards,
  estimatedRewards,
  totalLpRewards,
} from "../../src/modules/lpRewards";
import { secondsInAYear } from "../../src/constants";
import { Epoch, Snapshot } from "../../src";

describe("lpRewards module tests", () => {
  it("throws an error if snapshots array contains only 1 element", () => {
    const epoch: Epoch = {
      startTimestamp: 0,
      endTimestamp: 0,
      totalRewards: 0,
      cap: 0,
      targetAPR: 0,
    };
    const singleSnapshot: Snapshot[] = [
      { timestamp: 0, userLpShares: 100, totalLpShares: 1000 },
    ];
    expect(() => earnedRewards(epoch, singleSnapshot)).toThrow(
      "Insufficient data to compute rewards",
    );
  });

  it("throws an error if epoch duration is zero", () => {
    const invalidEpoch: Epoch = {
      startTimestamp: 0,
      endTimestamp: 0,
      totalRewards: 0,
      cap: 0,
      targetAPR: 0,
    };
    const snapshots: Snapshot[] = [
      { timestamp: 1000, userLpShares: 100, totalLpShares: 1000 },
      { timestamp: 2000, userLpShares: 200, totalLpShares: 1000 },
    ];
    expect(() => earnedRewards(invalidEpoch, snapshots)).toThrow(
      "Invalid epoch duration",
    );
  });

  it("calculates rewards with two snapshots", () => {
    const epoch: Epoch = {
      startTimestamp: 0,
      endTimestamp: 1000,
      totalRewards: 100,
      cap: 0,
      targetAPR: 0,
    };
    const snapshots: Snapshot[] = [
      { timestamp: 0, userLpShares: 100, totalLpShares: 1000 },
      { timestamp: 1000, userLpShares: 500, totalLpShares: 1000 },
    ];
    // Calculation:
    // percentOfEpoch = 100%
    // percentOfLpShares initial = 10%
    // percentOfLpShares final = 50%
    // reward = 1 * 0.5 * 100 = 50 shares extra
    const result = earnedRewards(epoch, snapshots);
    expect(result).toBe(50);
  });

  it("calculates rewards with > 2 snapshots", () => {
    const epoch: Epoch = {
      startTimestamp: 0,
      endTimestamp: 200,
      totalRewards: 1000,
      targetAPR: 20,
      cap: 10_000,
    };
    const snapshots: Snapshot[] = [
      { timestamp: 0, userLpShares: 100, totalLpShares: 1000 },
      { timestamp: 100, userLpShares: 150, totalLpShares: 1000 },
      { timestamp: 150, userLpShares: 200, totalLpShares: 1000 },
      { timestamp: 200, userLpShares: 400, totalLpShares: 1000 },
    ];

    // Calculation:
    // part 1: snapshot 0 to 1
    // Time fraction: (100 - 0) / (200 - 0) = 100 / 200 = 0.5
    // LP share: 150 / 1000 = 15%
    // Rewards: 0.5 * 0.15 * 1000 = 75 shares
    //
    // part 2: snapshot 1 to 2
    // Time fraction: (150 - 100) / 200 = 50 / 200 = 0.25
    // LP shares: 200 / 1000 = 20%
    // Rewards: 0.25 * 0.2 * 1000 = 50 shares
    //
    // part 3: snapshot 2 to 3
    // Time fraction: (200 - 150) / 200 = 50 / 200 = 0.25
    // LP shares: 400 / 1000 = 40%
    // Rewards: 0.25 * 0.4 * 1000 = 100
    //
    // Total rewards = 75 + 50 + 100 = 225
    const result = earnedRewards(epoch, snapshots);
    expect(result).toBe(225);
  });

  it("throws an error if epoch duration is zero", () => {
    const invalidEpoch: Epoch = {
      startTimestamp: 0,
      endTimestamp: 0,
      totalRewards: 0,
      cap: 0,
      targetAPR: 0,
    };
    expect(() => totalLpRewards(invalidEpoch)).toThrow(
      "Invalid epoch duration",
    );
  });

  it("calculates total LP rewards correctly", () => {
    const epoch: Epoch = {
      startTimestamp: 0,
      endTimestamp: secondsInAYear,
      targetAPR: 0.1,
      cap: 1000,
      totalRewards: 10_000,
    };
    // 0.1 * 1000 = 100
    const result = totalLpRewards(epoch);
    expect(result).toBe(100);
  });

  it("should calculate APR correctly for a 1 year period", () => {
    const rewards = 500; // 500 lp tokens
    const depositAmount = 10000; // 10k lp tokens
    const timeInSeconds = secondsInAYear;

    const apr = calculateApr(rewards, depositAmount, timeInSeconds);
    expect(apr).toBe(0.05); // 5% APR
  });

  it("should calculate APR correctly for a partial year", () => {
    const rewards = 250;
    const depositAmount = 10000;
    const timeInSeconds = secondsInAYear / 2; // 6 months

    const apr = calculateApr(rewards, depositAmount, timeInSeconds);
    expect(apr).toBe(0.05); // Still 5% APR when annualized
  });

  it("should throw error for zero deposit amount or invalid time period", () => {
    expect(() => {
      calculateApr(100, 0, secondsInAYear);
    }).toThrow("Deposit amount must be positive");

    expect(() => {
      calculateApr(100, 1000, -1);
    }).toThrow("Time period must be positive");
  });

  it("should calculate rewards correctly for one year", () => {
    const depositAmount = 10000;
    const apr = 0.05;
    const durationInSeconds = secondsInAYear;

    const rewards = estimatedRewards(depositAmount, apr, durationInSeconds);
    expect(rewards).toBe(500);
  });

  it("should calculate rewards correctly for a quarter of year", () => {
    const depositAmount = 10000;
    const apr = 0.05;
    const durationInSeconds = secondsInAYear / 4;

    const rewards = estimatedRewards(depositAmount, apr, durationInSeconds);
    expect(rewards).toBe(125); // (5% APY of 10000 notional) / 4 a quarter of the year
  });

  it("should throw error for invalid APR, time period or amount", () => {
    expect(() => {
      estimatedRewards(1000, -0.05, secondsInAYear);
    }).toThrow("APR cannot be negative");

    expect(() => {
      estimatedRewards(0, 0.05, secondsInAYear);
    }).toThrow("Deposit amount must be positive");

    expect(() => {
      estimatedRewards(1000, 0.05, 0);
    }).toThrow("Duration must be positive");
  });
});
