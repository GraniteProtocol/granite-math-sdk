import { InterestRateParams } from "../src";
import { calculateBorrowAPY, calculateLpAPY } from "../src/functions";

test("calculateLpAPY", () => {
  function testApyParams(): InterestRateParams {
    return {
      urKink: 0.8,
      baseIR: 0.15,
      slope1: 0,
      slope2: 0,
    };
  }

  expect(calculateLpAPY(0, testApyParams(), 0)).toBe(0);
});

test("calculateBorrowAPY", () => {
  function testApyParams(): InterestRateParams {
    return {
      urKink: 0.8,
      baseIR: 0.15,
      slope1: 0,
      slope2: 0,
    };
  }

  expect(calculateBorrowAPY(0, testApyParams())).toBeCloseTo(0.16); // equals to baseIR + compounded interest
});
