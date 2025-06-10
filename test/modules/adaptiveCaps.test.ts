import { computeBucketValue } from "../../src/modules/adaptiveCaps";

describe("Adaptive caps module tests", () => {
  it("returns current cap value when no time has passed", () => {
    const capFactor = 0.05; // 5%
    const totalLiquidity = 1000;
    const currentCapValue = 20;
    const timeDelta = 0;
    const resetTime = 86400; // one day in seconds

    const newCap = computeBucketValue(
      capFactor,
      currentCapValue,
      totalLiquidity,
      timeDelta,
      resetTime,
    );
    expect(newCap).toEqual(currentCapValue);
  });

  it("properly refills bucket for partial time", () => {
    const capFactor = 0.05;
    const totalLiquidity = 1000;
    const currentCapValue = 10;
    const resetTime = 86400;
    const timeDelta = 43200; // half a day

    // maxBucketValue = 50
    // refillAmount = (50 * 43200) / 86400 = 25
    // new bucket value = min(50, 10 + 25) = 35
    const newCap = computeBucketValue(
      capFactor,
      currentCapValue,
      totalLiquidity,
      timeDelta,
      resetTime,
    );
    expect(newCap).toEqual(35);
  });

  it("caps at maximum bucket value when refill exceeds capacity", () => {
    const capFactor = 0.05;
    const totalLiquidity = 1000;
    const currentCapValue = 40;
    const resetTime = 86400;
    const timeDelta = 43200; // half a day

    // maxBucketValue = 50
    // refillAmount = 25 as in previous test
    // new bucket value = 40 + 25 = 65, but capped by min function at 50
    const newCap = computeBucketValue(
      capFactor,
      currentCapValue,
      totalLiquidity,
      timeDelta,
      resetTime,
    );
    expect(newCap).toEqual(50);
  });

  it("refills to maximum when timeDelta exceeds resetTime", () => {
    const capFactor = 0.05;
    const totalLiquidity = 1000;
    const currentCapValue = 0;
    const resetTime = 86400;
    const timeDelta = resetTime + 100; // more than one day

    // When timeDelta > resetTime, refillAmount is set to maxBucketValue = 50
    // new bucket value = min(50, 0 + 50) = 50
    const newCap = computeBucketValue(
      capFactor,
      currentCapValue,
      totalLiquidity,
      timeDelta,
      resetTime,
    );
    expect(newCap).toEqual(50);
  });
});
