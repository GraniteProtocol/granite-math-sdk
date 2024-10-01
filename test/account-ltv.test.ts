import { calculateAccountLiqLTV, calculateAccountLTV, calculateAccountMaxLTV, calculateBorrowCapacity } from "../src/functions";
import { Collateral } from "../src/types";
import { createCollateral } from "./utils";

describe("calculateAccountLTV", () => {
  it("calculates account LTV correctly with single collateral", () => {
    const accountTotalDebt = 500;
    const collaterals = [createCollateral(100, 10, 0.7)];

    const ltv = calculateAccountLTV(accountTotalDebt, collaterals);

    // Expected LTV: 500 / (100 * 10) = 0.5
    expect(ltv).toBe(0.5);
  });

  it("calculates account LTV correctly with multiple collaterals", () => {
    const accountTotalDebt = 1000;
    const collaterals = [
      createCollateral(100, 10, 0.8),
      createCollateral(200, 5, 0.5),
      createCollateral(50, 20, 0.2),
    ];

    const ltv = calculateAccountLTV(accountTotalDebt, collaterals);

    // Expected LTV: 1000 / (100 * 10 + 200 * 5 + 50 * 20) = 0.333
    expect(ltv).toBeCloseTo(0.333);
  });

  it("returns 0 when there are no collaterals", () => {
    const accountTotalDebt = 1000;
    const collaterals: Collateral[] = [];

    const ltv = calculateAccountLTV(accountTotalDebt, collaterals);

    expect(ltv).toBe(0);
  });

  it("returns 0 when total collateral value is 0", () => {
    const accountTotalDebt = 1000;
    const collaterals = [
      createCollateral(0, 10, 0.5),
      createCollateral(100, 0, 0.7),
    ];

    const ltv = calculateAccountLTV(accountTotalDebt, collaterals);

    expect(ltv).toBe(0);
  });

  it("calculates correct LTV for 0 debt", () => {
    const accountTotalDebt = 0;
    const collaterals = [createCollateral(100, 10, 0.8)];

    const ltv = calculateAccountLTV(accountTotalDebt, collaterals);

    expect(ltv).toBe(0);
  });

  it("calculates correct LTV for underwater account", () => {
    const accountTotalDebt = 2000;
    const collaterals = [createCollateral(100, 10, 0.8)];

    const ltv = calculateAccountLTV(accountTotalDebt, collaterals);

    // Expected LTV: 2000 / (100 * 10) = 2
    expect(ltv).toBe(2);
  });

  it("calculates correct LTV with mixed collateral values", () => {
    const accountTotalDebt = 1000;
    const collaterals = [
      createCollateral(100, 10, 0.8),
      createCollateral(0, 50, 0.2),
      createCollateral(200, 0, 0.5),
      createCollateral(50, 20, 0.4),
    ];

    const ltv = calculateAccountLTV(accountTotalDebt, collaterals);

    // Expected LTV: 1000 / (100 * 10 + 0 * 50 + 200 * 0 + 50 * 20) = 0.5
    expect(ltv).toBe(0.5);
  });

  it("calculates account max LTV correctly with a single collateral", () => {
    const collaterals = [createCollateral(100, 10, 0.7)];

    const ltv = calculateAccountMaxLTV(collaterals);

    // Expected LTV: (100 * 10 * 0.7) / (100 * 10) = 0.7
    expect(ltv).toBe(0.7);
  });

  it("calculates account max LTV correctly with multiple collaterals", () => {
    const collaterals = [
      createCollateral(100, 10, 0.7),
      createCollateral(12, 1, 0.4),
      createCollateral(1200, 10, 0.6),
    ];

    const ltv = calculateAccountMaxLTV(collaterals);
    expect(ltv).toBeCloseTo(0.6075);
  });

  it("calculates account liq LTV correctly with multiple collaterals", () => {
    const collaterals = [
      createCollateral(100, 10, 0.7, 0.9),
      createCollateral(12, 1, 0.4, 0.6),
      createCollateral(1200, 10, 0.6, 0.7),
    ];

    // (100 * 10 * 0.9 + 12 * 1 * 0.6 + 1200 * 10 * 0.7) / (100 * 10 + 12 + 1200 * 10) = 0.715

    const liqLtv = calculateAccountLiqLTV(collaterals);
    expect(liqLtv).toBeCloseTo(0.715);
  });

  it('calculate borrow capacity', () => {
    const collaterals = [
      createCollateral(100, 10, 0.9),
    ];
    const capacity = calculateBorrowCapacity(collaterals)
    expect(capacity).toBe(900);
  })
});
