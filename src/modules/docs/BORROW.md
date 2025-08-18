# Understanding Borrowing and Interest Rates

Let's understand how borrowing works in Granite protocol through a real-world example.

## The Story

Meet David, who wants to understand how borrowing and interest rates work in the protocol. The protocol currently has:

```typescript
const protocolState = {
  totalAssets: 1000000, // $1M total deposits
  openInterest: 600000, // $600K borrowed
  totalDebtShares: 100000, // Total debt shares
  reserveBalance: 50000, // Protocol reserve
  irParams: {
    baseIR: 0.01, // 1% base interest rate
    slope1: 0.1, // 10% slope up to kink
    slope2: 1.0, // 100% slope after kink
    urKink: 0.8, // Kink at 80% utilization
  },
  protocolReservePercentage: 0.1, // 10% of interest goes to reserves
};
```

## Understanding Utilization Rate

The utilization rate is key to determining borrowing costs:

```typescript
// Utilization Rate = Total Borrowed / Total Assets
const utilizationRate = openInterest / totalAssets;
// UR = 600,000 / 1,000,000 = 0.6 (60%)

console.log("Current utilization:", utilizationRate);
```

### Interest Rate Model

Let's see how interest rates change with utilization:

```typescript
// Below kink point (80% utilization):
// rate = baseIR + slope1 x utilizationRate

// At 60% utilization:
const currentRate = 0.01 + 0.1 x 0.6;
// = 0.01 + 0.06
// = 0.07 (7% APR)

// If utilization goes above kink (e.g., 90%):
const highUtilRate = 0.01 + (0.1 x 0.8) + (1.0 x (0.9 - 0.8));
// = 0.01 + 0.08 + 0.1
// = 0.19 (19% APR)
```

## David's Borrowing Journey

### Step 1: Checking Available Liquidity

David wants to borrow $100,000. Let's check if there's enough liquidity:

```typescript
const davidBorrow = 100000;
const freeLiquidity = totalAssets - openInterest;
// = 1,000,000 - 600,000 = $400,000

// Available to borrow (excluding reserves):
const availableToBorrow = freeLiquidity - reserveBalance;
// = 400,000 - 50,000 = $350,000

if (davidBorrow <= availableToBorrow) {
  console.log("Sufficient liquidity for David's borrow");
} else {
  console.log("Insufficient liquidity");
}
```

### Step 2: Converting to Debt Shares

When David borrows, his debt is converted to shares:

```typescript
// Current share price = (openInterest + accruedInterest) / totalDebtShares
const timeDelta = 3600; // 1 hour since last update

// Calculate accrued interest
const currentUR = 0.6; // 60% utilization
const currentAPR = 0.07; // 7% as calculated above
const accruedInterest =
  openInterest * ((1 + currentAPR / secondsInYear) ** timeDelta - 1);
// = 600,000 * (1.07 ^ (1/8760) - 1)
// ≈ 478.77

// Convert David's borrow to shares
const davidShares =
  (davidBorrow * totalDebtShares) /
  (openInterest + accruedInterest * (1 - protocolReservePercentage));
// ≈ 16,667 shares
```

### Step 3: Interest Accumulation

Let's see how David's debt grows over time:

```typescript
// After 30 days:
const thirtyDays = 30 * 24 * 3600; // seconds in 30 days

// New utilization after David's borrow:
const newOpenInterest = openInterest + davidBorrow;
const newUR = newOpenInterest / totalAssets;
// = 700,000 / 1,000,000 = 0.7 (70%)

// New interest rate:
const newAPR = 0.01 + 0.1 * 0.7;
// = 0.08 (8% APR)

// David's debt after 30 days:
const davidDebt =
  (davidShares *
    (newOpenInterest +
      newOpenInterest * ((1 + newAPR / secondsInYear) ** thirtyDays - 1))) /
  totalDebtShares;
// ≈ $100,657 (grew by $657)
```

## Protocol Reserve Growth

The protocol takes a portion of interest for reserves:

```typescript
// Interest earned in 30 days
const totalInterest = davidDebt - davidBorrow;
// = 657

// Amount to reserves
const toReserves = totalInterest * protocolReservePercentage;
// = 657 * 0.1 = $65.70 added to reserves
```

## Common Borrowing Scenarios

### 1. Low Utilization Borrowing

```typescript
const lowUtilExample = {
  utilization: 0.3, // 30%
  interestRate: 0.01 + 0.1 * 0.3,
  // = 0.04 (4% APR)
  borrowingCost: "Low and stable",
};
```

### 2. High Utilization Borrowing

```typescript
const highUtilExample = {
  utilization: 0.85, // 85%
  interestRate: 0.01 + 0.1 * 0.8 + 1.0 * (0.85 - 0.8),
  // = 0.13 (13% APR)
  borrowingCost: "High and increasing rapidly",
};
```

### 3. Maximum Borrow Calculation

```typescript
const maxBorrowExample = {
  freeLiquidity: 400000,
  reserveBalance: 50000,
  maxBorrow: 400000 - 50000,
  // = $350,000 maximum borrow amount
  warning: "Subject to collateral limits",
};
```

## Why This Design Works

1. **Dynamic Interest Rates**:

   ```typescript
   // Interest rate increases with utilization
   // This ensures:
   - Low rates when liquidity is abundant
   - High rates to discourage borrowing when liquidity is scarce
   - Very high rates above kink point to maintain reserve
   ```

2. **Share-Based Debt Tracking**:

   ```typescript
   // Benefits:
   - Interest automatically distributed among borrowers
   - No need to update each account on interest accrual
   - Gas-efficient for large number of borrowers
   ```

3. **Protocol Reserves**:
   ```typescript
   // Reserve growth ensures:
   - Protocol sustainability
   - Emergency liquidity buffer
   - Potential protocol token holder benefits
   ```

## Testing Your Implementation

```typescript
// Test 1: Interest Rate Calculation
const interestRateTest = {
  utilizationPoints: [
    { ur: 0.3, expectedRate: 0.04 },
    { ur: 0.6, expectedRate: 0.07 },
    { ur: 0.8, expectedRate: 0.09 },
    { ur: 0.9, expectedRate: 0.19 },
  ],
};

// Test 2: Debt Share Conversion
const debtShareTest = {
  borrow: 100000,
  expectedShares: 16667,
  afterOneMonth: {
    expectedDebt: 100657,
    expectedReserves: 65.7,
  },
};

// Test 3: Protocol Limits
const protocolLimitTest = {
  scenarios: [
    {
      description: "Normal operation",
      utilization: 0.6,
      canBorrow: true,
    },
    {
      description: "Near max capacity",
      utilization: 0.95,
      canBorrow: false,
    },
  ],
};
```
