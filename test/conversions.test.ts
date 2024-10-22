import { convertDebtSharesToAssets, secondsInAYear } from "../src/functions";
import { InterestRateParams } from "../src/types";

describe("convertDebtSharesToAssets", () => {
  function testApyParams(): InterestRateParams {
    return {
      urKink: 0.8,
      baseIR: 0.15, // 15% APR != APY
      slope1: 0,
      slope2: 0,
    };
  }

  it("basic conversion with no interest accrual", () => {
    const result = convertDebtSharesToAssets(
      1000, // debtShares
      10000, // openInterest
      10000, // totalDebtShares
      20000, // totalAssets
      testApyParams(),
      0, // seconds
    );
    expect(result).toBe(1000);
  });

  it("conversion with interest accrual (1 year)", () => {
    const result = convertDebtSharesToAssets(
      1000, // debtShares
      10000, // openInterest
      10000, // totalDebtShares
      20000, // totalAssets
      testApyParams(),
      secondsInAYear,
    );
    expect(result).toBeCloseTo(1161.83);
  });

  it("conversion with 0 totalDebtShares", () => {
    const result = convertDebtSharesToAssets(
      1000, // debtShares
      10000, // openInterest
      0, // totalDebtShares
      20000, // totalAssets
      testApyParams(),
      6000, // timeDelta
    );
    expect(result).toBe(0);
  });

  it("conversion with different utilization rates", () => {
    const lowUtilization = convertDebtSharesToAssets(
      1000, // debtShares
      5000, // openInterest
      10000, // totalDebtShares
      100000, // totalAssets (5% utilization)
      testApyParams(),
      2628000, // ~1 month in seconds
    );

    const highUtilization = convertDebtSharesToAssets(
      1000, // debtShares
      80000, // openInterest
      10000, // totalDebtShares
      100000, // totalAssets (80% utilization)
      testApyParams(),
      2592000, // ~1 month in seconds
    );

    expect(highUtilization).toBeGreaterThan(lowUtilization);
  });
});
