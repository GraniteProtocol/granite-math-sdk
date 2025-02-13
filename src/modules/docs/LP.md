# Understanding Liquidity Provision

Let's understand how providing liquidity works in Granite protocol through a real-world example.

## The Story

Meet Emma, who wants to earn yield by providing liquidity to the protocol. The current protocol state is:

```typescript
const protocolState = {
  totalAssets: 1000000, // $1M total deposits
  totalShares: 100000, // Total LP shares
  openInterest: 600000, // $600K borrowed
  irParams: {
    baseIR: 0.01, // 1% base interest rate
    slope1: 0.1, // 10% slope up to kink
    slope2: 1.0, // 100% slope after kink
    urKink: 0.8, // Kink at 80% utilization
  },
  protocolReservePercentage: 0.1, // 10% of interest goes to reserves
};
```

## Understanding LP Shares

### Step 1: Initial Deposit

Emma wants to deposit $50,000. Let's calculate how many LP shares she'll receive:

```typescript
const emmaDeposit = 50000;

// First, calculate current share price
// Share price = (totalAssets + accruedInterest) / totalShares

// Calculate accrued interest (assuming 1 hour since last update)
const timeDelta = 3600; // 1 hour
const utilizationRate = openInterest / totalAssets; // 60%
const currentAPR = 0.01 + 0.1 * utilizationRate; // 7%

const accruedInterest =
  openInterest * ((1 + currentAPR / secondsInYear) ** timeDelta - 1); // ≈ 478.77

const sharePrice = (totalAssets + accruedInterest) / totalShares;
// = (1,000,000 + 478.77) / 100,000
// ≈ 10.00479 per share

// Calculate Emma's shares
const emmaShares = emmaDeposit / sharePrice;
// = 50,000 / 10.00479
// ≈ 4,997.6 shares
```

### Step 2: Earning Interest

As borrowers pay interest, the value of LP shares increases. Let's see Emma's earnings after 30 days:

```typescript
// After 30 days:
const thirtyDays = 30 * 24 * 3600;

// New utilization after Emma's deposit
const newTotalAssets = totalAssets + emmaDeposit;
const newUR = openInterest / newTotalAssets;
// = 600,000 / 1,050,000 ≈ 57.14%

// New interest rate
const newAPR = 0.01 + 0.1 * newUR;
// ≈ 6.71%

// Calculate total interest earned
const totalInterest =
  openInterest * ((1 + newAPR / secondsInYear) ** thirtyDays - 1);
// ≈ 10,057

// Interest to LPs (90% of total)
const lpInterest = totalInterest * (1 - protocolReservePercentage);
// = 10,057 * 0.9 ≈ 9,051.3

// New share price
const newSharePrice =
  (newTotalAssets + lpInterest) / (totalShares + emmaShares);
// ≈ 10.0086 per share

// Emma's new value
const emmaValue = emmaShares * newSharePrice;
// ≈ 50,043.15

// Emma's profit
const emmaProfit = emmaValue - emmaDeposit;
// ≈ $43.15 (≈ 6.71% APY)
```

## APY Calculation

Let's understand how Emma's APY is calculated:

```typescript
// APY calculation
function calculateLpAPY(ur: number, irParams: InterestRateParams) {
  // 1. Calculate borrow APR
  const borrowAPR = irParams.baseIR + irParams.slope1 * ur;

  // 2. Calculate LP APR
  // LP APR = Borrow APR × Utilization × (1 - Reserve %)
  const lpAPR = borrowAPR * ur * (1 - protocolReservePercentage);

  // 3. Convert to APY
  const lpAPY = (1 + lpAPR / secondsInYear) ** secondsInYear - 1;
  return lpAPY;
}

// Emma's expected APY at different utilization rates:
const apyScenarios = {
  lowUtil: {
    ur: 0.3,
    apy: calculateLpAPY(0.3, irParams), // ≈ 0.81%
  },
  currentUtil: {
    ur: 0.5714, // After Emma's deposit
    apy: calculateLpAPY(0.5714, irParams), // ≈ 6.71%
  },
  highUtil: {
    ur: 0.85,
    apy: calculateLpAPY(0.85, irParams), // ≈ 19.32%
  },
};
```

## Withdrawing Liquidity

After a month, Emma decides to withdraw half her position:

```typescript
const withdrawAmount = emmaValue / 2; // ≈ $25,021.57

// Calculate shares to burn
const sharesToBurn = withdrawAmount / newSharePrice;
// ≈ 2,498.8 shares

// Verify withdrawal is possible
const freeLiquidity = newTotalAssets - openInterest;
if (withdrawAmount <= freeLiquidity) {
  console.log("Withdrawal possible");
} else {
  console.log("Insufficient liquidity, must wait for borrowers to repay");
}

// Emma's remaining position
const remainingShares = emmaShares - sharesToBurn;
const remainingValue = remainingShares * newSharePrice;
// ≈ $25,021.57
```

## Common LP Scenarios

### 1. Early LP Rewards

```typescript
const earlyLpExample = {
  phase: "Protocol Launch",
  benefits: {
    highAPY: "Higher utilization as borrowers join",
    lowCompetition: "Larger share of the interest fees",
    potential: "Growth in protocol usage increases earnings",
  },
};
```

### 2. Mature Protocol

```typescript
const matureLpExample = {
  phase: "Established Protocol",
  characteristics: {
    stableAPY: "More predictable earnings",
    lowerRisk: "Proven protocol mechanics",
    liquidity: "Easier to enter/exit positions",
  },
};
```

### 3. Market Stress

```typescript
const stressExample = {
  scenario: "High Utilization",
  implications: {
    higherAPY: "More interest earned from borrowers",
    withdrawalRisk: "Might have to wait to withdraw",
    opportunity: "Good time to provide liquidity",
  },
};
```

## Why This Design Works

1. **Automatic Interest Distribution**:

   ```typescript
   // Interest automatically reflected in share price
   // No need to claim rewards
   // Gas efficient for all participants
   ```

2. **Fair Value Calculation**:

   ```typescript
   // Share price includes:
   // - Base deposits
   // - Accrued interest
   // - Protocol fees
   // Ensures fairness between old and new LPs
   ```

3. **Risk-Reward Balance**:
   ```typescript
   // Higher utilization = Higher APY but lower liquidity
   // Lower utilization = Lower APY but easier to exit
   // Natural market balance
   ```

## Testing Your Implementation

```typescript
// Test 1: Share Price Calculation
const sharePriceTest = {
  scenarios: [
    {
      description: "No interest accrued",
      totalAssets: 1000000,
      totalShares: 100000,
      expectedPrice: 10.0,
    },
    {
      description: "With accrued interest",
      totalAssets: 1000000,
      accruedInterest: 10000,
      totalShares: 100000,
      expectedPrice: 10.1,
    },
  ],
};

// Test 2: APY Calculation
const apyTest = {
  utilizationPoints: [
    { ur: 0.3, expectedAPY: 0.0081 },
    { ur: 0.5714, expectedAPY: 0.0671 },
    { ur: 0.85, expectedAPY: 0.1932 },
  ],
};

// Test 3: Withdrawal Scenarios
const withdrawalTest = {
  scenarios: [
    {
      description: "Sufficient liquidity",
      withdrawAmount: 25000,
      freeLiquidity: 450000,
      expectedSuccess: true,
    },
    {
      description: "Insufficient liquidity",
      withdrawAmount: 500000,
      freeLiquidity: 450000,
      expectedSuccess: false,
    },
  ],
};
```
