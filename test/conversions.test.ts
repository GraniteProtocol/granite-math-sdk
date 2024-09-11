import { convertDebtSharesToAssets } from "../src/functions";
import { InterestRateParams } from "../src/types";

const avgBlocktime = 12;

describe("convertDebtSharesToAssets", () => {
  function testApyParams(): InterestRateParams {
    return {
      urKink: 0.8,
      baseIR: 0.15, // 15% APR != APY
      slope1: 0,
      slope2: 0,
    };
  }

  test("basic conversion with no interest accrual", () => {
    const result = convertDebtSharesToAssets(
      1000, // debtShares
      10000, // openInterest
      10000, // totalDebtShares
      20000, // totalAssets
      testApyParams(),
      avgBlocktime,
      0, // blocks
    );
    expect(result).toBe(1000);
  });

  test("conversion with interest accrual (1 year)", () => {
    const blocksInYear = (365 * 24 * 60 * 60) / 12;
    const result = convertDebtSharesToAssets(
      1000, // debtShares
      10000, // openInterest
      10000, // totalDebtShares
      20000, // totalAssets
      testApyParams(),
      avgBlocktime,
      blocksInYear,
    );
    expect(result).toBeCloseTo(1161.83);
  });

  test("conversion with 0 totalDebtShares", () => {
    const result = convertDebtSharesToAssets(
      1000, // debtShares
      10000, // openInterest
      0, // totalDebtShares
      20000, // totalAssets
      testApyParams(),
      avgBlocktime,
      1000, // blocks
    );
    expect(result).toBe(0);
  });

  test("conversion with different utilization rates", () => {
    const lowUtilization = convertDebtSharesToAssets(
      1000, // debtShares
      5000, // openInterest
      10000, // totalDebtShares
      100000, // totalAssets (5% utilization)
      testApyParams(),
      avgBlocktime,
      2628000, // ~1 month in blocks
    );

    const highUtilization = convertDebtSharesToAssets(
      1000, // debtShares
      80000, // openInterest
      10000, // totalDebtShares
      100000, // totalAssets (80% utilization)
      testApyParams(),
      avgBlocktime,
      2628000, // ~1 month in blocks
    );

    expect(highUtilization).toBeGreaterThan(lowUtilization);
  });
});
