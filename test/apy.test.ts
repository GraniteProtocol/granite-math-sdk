import { InterestRateParams } from "../src";
import {
  calculateBorrowAPY,
  calculateLpAPY,
  secondsInAYear,
} from "../src/functions";

describe("APY Calculation Functions", () => {
  it("should return 0 when utilization rate and rewards are 0", () => {
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

  it("should return baseIR plus compounded interest when utilization rate is 0", () => {
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

  it("should calculate APY correctly for high utilization rate without rewards", () => {
    function testApyParams(): InterestRateParams {
      return {
        urKink: 0.8,
        baseIR: 0.05,
        slope1: 0.7,
        slope2: 1.5,
      };
    }

    const utilizationRate = 0.9;
    const protocolReservePercentage = 0;
    const totalAPR = (0.05 + 0.8 * 0.7 + (0.9 - 0.8) * 1.5) * utilizationRate;
    const apy = (1 + totalAPR / secondsInAYear) ** secondsInAYear - 1;

    expect(
      calculateLpAPY(
        utilizationRate,
        testApyParams(),
        protocolReservePercentage,
      ),
    ).toBeCloseTo(apy);
  });
});
