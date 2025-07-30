import { calculateAccountMaxLTV, calculateBorrowCapacity, leverageHelper, maxLeverage } from "../../src";
import { createCollateral } from "../utils";

describe("Leverage module tests", () => {
  it("calculates account max LTV and resulting max leverage for a single collateral", () => {
    const collaterals = [createCollateral(100, 10, 0.7, 0.7)];
    const ltv = calculateAccountMaxLTV(collaterals);
    expect(ltv).toBe(0.7);
    const leverage = maxLeverage(collaterals);
    expect(leverage).toBe(3.333333333333333);
  });

  it("max leverage is 1x if an invalid maxLTV is supplied", () => {
    const collaterals = [createCollateral(100, 10, 1.1, 1.2)];
    const ltv = calculateAccountMaxLTV(collaterals);
    expect(ltv).toBe(1.1);
    const leverage = maxLeverage(collaterals);
    expect(leverage).toBe(1);
  });

  it("calculates account max LTV and resulting max leverage for multi collaterals", () => {
    const collaterals = [
      createCollateral(100, 10, 0.7, 0.7),
      createCollateral(1200, 1, 0.8, 0.9)
    ];
    const ltv = calculateAccountMaxLTV(collaterals);
    expect(ltv).toBe(0.7545454545454545);
    const leverage = maxLeverage(collaterals);
    expect(leverage).toBe(4.0740740740740735);
  });

  it("computes correctly leveraged collateral", () => {
    const collaterals = [createCollateral(100, 10, 0.7, 0.7)];
    let leverage = maxLeverage(collaterals);
    leverage = Number(leverage.toFixed(2));
    const debt = calculateBorrowCapacity(collaterals);
  
    const result = leverageHelper(collaterals[0], leverage, debt);
    expect(result.collateral).toBe(2330);
    expect(result.debt).toBe(1630);
  });

  it("fails with invalid leverage value", () => {
    const collaterals = [createCollateral(100, 10, 0.7, 0.7)];
    expect(() => leverageHelper(collaterals[0], 0, 0)).toThrow(
      "Invalid leverage value",
    );
  });
});
