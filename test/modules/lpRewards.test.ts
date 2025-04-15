import {
  Epoch,
  secondsInAYear,
  estimatedRewards,
  calculateApr,
} from "../../src";

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
    const apr = calculateApr(500_000, 100, epoch);
    expect(apr).toBe(0.1533); // Still 15% APR when annualized
  });
});
