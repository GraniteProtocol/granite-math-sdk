import {
  computeUtilizationRate,
  calculateDueInterest,
  compoundedInterest,
  convertLpAssetsToShares,
  convertLpSharesToAssets,
  calculateLpAPY,
  calculateBorrowAPY,
  secondsInAYear,
  userAvailableToBorrow,
  calculateMaxRepayAmount,
  calculateTotalCollateralValue,
} from "../src/functions";
import { InterestRateParams } from "../src/types";
import { createCollateral } from "./utils";

it("computeUtilizationRate", () => {
  expect(computeUtilizationRate(10, 100)).toBe(0.1);
  expect(computeUtilizationRate(101, 100)).toBe(1.01);
});

it("calculateDueInterest", () => {
  const irParams: InterestRateParams = {
    urKink: 0.7,
    baseIR: 0.5,
    slope1: 0.75,
    slope2: 1.5,
  };
  expect(calculateDueInterest(1, 500, 500, irParams, 6000)).toBeCloseTo(
    1.0002853
  );
});

it("compoundedInterest", () => {
  const irParams: InterestRateParams = {
    urKink: 0.7,
    baseIR: 0.5,
    slope1: 0.75,
    slope2: 1.5,
  };
  const interest = compoundedInterest(1, 500, 500, irParams, 6000);
  const principal = calculateDueInterest(1, 500, 500, irParams, 6000);
  expect(principal - interest).toBe(1);
});

it("convertLpAssetsToShares", () => {
  const irParams: InterestRateParams = {
    urKink: 0.7,
    baseIR: 0.5,
    slope1: 0.75,
    slope2: 1.5,
  };

  expect(convertLpAssetsToShares(100, 8000, 10000, 0, 0, irParams, 0)).toBe(80);
  // LP share value increases
  expect(
    convertLpAssetsToShares(100, 8000, 10000, 1000, 0, irParams, 6000)
  ).toBeLessThan(80);
  // LP assets should have increased in number
  expect(
    convertLpSharesToAssets(80, 8000, 10000, 1000, 0, irParams, 6000)
  ).toBeGreaterThan(80);
});

describe("APY Calculations", () => {
  const irParams: InterestRateParams = {
    urKink: 0.8,
    baseIR: 0.02,
    slope1: 0.1,
    slope2: 0.2,
  };

  it("should return 0 for LP APY if utilization rate is 0", () => {
    const ur = 0;
    const protocolReservePercentage = 0.1;

    const result = calculateLpAPY(ur, irParams, protocolReservePercentage);
    expect(result).toBe(0);
  });

  it("should return base APY for Borrow APY if utilization rate is 0", () => {
    const ur = 0;
    const result = calculateBorrowAPY(ur, irParams);
    expect(result).toBeGreaterThan(irParams.baseIR);
  });

  it("userAvailableToBorrow takes into account current debt", () => {
    const collaterals = [createCollateral(100, 1, 0.5)];
    const freeLiquidity = 100;
    // 100 * 1 * 0.5 = 50

    const result = userAvailableToBorrow(collaterals, freeLiquidity, 0, 40);
    expect(result).toBe(10);
  });

  it("userAvailableToBorrow is capped by free liquidity", () => {
    const collaterals = [createCollateral(100, 1, 0.5)];
    const freeLiquidity = 9;
    const reserveBalance = 1;

    const result = userAvailableToBorrow(
      collaterals,
      freeLiquidity,
      reserveBalance,
      40
    );
    expect(result).toBe(8); // should be 10 but free liquidity - reserve balance is 8
  });

  it("calculates max repay correctly", () => {
    const irParams: InterestRateParams = {
      urKink: 0.7,
      baseIR: 0.5,
      slope1: 0.75,
      slope2: 1.5,
    };
    const result = calculateMaxRepayAmount(
      1000, // debtShares
      10000, // openInterest
      10000, // totalDebtShares
      20000, // totalAssets
      irParams,
      2592000 // seconds in one month
    );
    expect(result).toBeCloseTo(1074.596, 3);
  });

  it("calculate total collateral value correctly", () => {
    const collaterals = [
      createCollateral(1000, 10),
      createCollateral(250, 0.5),
    ];

    const val = calculateTotalCollateralValue(collaterals);
    expect(val).toBe(10125);
  });
});
