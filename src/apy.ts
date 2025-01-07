const ONE_12 = 1000000000000n;
const SECONDS_IN_YEAR = 31536000n;

const FACT_2 = 2000000000000n; // 2 * ONE_12
const FACT_3 = 6000000000000n; // 6 * ONE_12
const FACT_4 = 24000000000000n; // 24 * ONE_12
const FACT_5 = 120000000000000n; // 120 * ONE_12
const FACT_6 = 720000000000000n; // 720 * ONE_12

export type InterestRateParams = {
  urKink: bigint;
  baseIR: bigint;
  slope1: bigint;
  slope2: bigint;
};

export function annualizedAPR(ur: bigint, irParams: InterestRateParams) {
  let ir: bigint;
  if (ur < irParams.urKink) ir = irParams.slope1 * ur + irParams.baseIR;
  else
    ir =
      irParams.slope2 * (ur - irParams.urKink) +
      irParams.slope1 * irParams.urKink +
      irParams.baseIR;

  return ir;
}

function mulFixed12(x12: bigint, y12: bigint) {
  return (x12 * y12 + ONE_12 / 2n) / ONE_12;
}

function divFixed12(x12: bigint, y12: bigint) {
  if (y12 === 0n) {
    throw new Error("Division by zero");
  }
  return (x12 * ONE_12 + y12 / 2n) / y12;
}

function taylor6(x12: bigint) {
  const x2 = mulFixed12(x12, x12);
  const x3 = mulFixed12(x12, x2);
  const x4 = mulFixed12(x12, x3);
  const x5 = mulFixed12(x12, x4);
  const x6 = mulFixed12(x12, x5);

  const sum =
    ONE_12 +
    x12 +
    divFixed12(x2, FACT_2) +
    divFixed12(x3, FACT_3) +
    divFixed12(x4, FACT_4) +
    divFixed12(x5, FACT_5) +
    divFixed12(x6, FACT_6);

  return sum;
}

function getRTByBlock(rate12: bigint, elapsedSecs: bigint) {
  const step1 = elapsedSecs * ONE_12;
  const step2 = divFixed12(step1, SECONDS_IN_YEAR);
  const step3 = rate12 * step2;
  const result12 = (step3 + ONE_12 / 2n) / ONE_12;
  return result12;
}

function compoundedInterestFactor(rate12: bigint, elapsedSecs: bigint) {
  const x12 = getRTByBlock(rate12, elapsedSecs);

  const ePowX_12 = taylor6(x12);

  if (ePowX_12 <= ONE_12) {
    return 0n;
  } else {
    return ePowX_12 - ONE_12;
  }
}

function calcTotalInterest(
  principal12: bigint,
  rate12: bigint,
  elapsedSecs: bigint,
) {
  // factor12 = e^x - 1 in 12-decimal
  const factor12 = compoundedInterestFactor(rate12, elapsedSecs);
  return mulFixed12(principal12, factor12);
}

function computeUtilizationRate(
  openInterest: bigint,
  totalAssets: bigint,
): bigint {
  if (totalAssets == 0n) return 0n;
  return openInterest / totalAssets;
}

export function computeInterest(
  principal: bigint,
  openInterest: bigint,
  totalAssets: bigint,
  elapsedSeconds: bigint,
  irParams: InterestRateParams,
) {
  const ur = computeUtilizationRate(openInterest, totalAssets);
  const annualRate = annualizedAPR(ur, irParams);
  const interest12 = calcTotalInterest(principal, annualRate, elapsedSeconds);
  const interestFloat = Number(interest12) / Number(ONE_12);
  return interestFloat;
}
