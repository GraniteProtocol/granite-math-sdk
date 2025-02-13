# Understanding Account Health and Risk Management

Let's understand how Granite protocol manages account health and risk through a real-world example.

## The Story

Meet Charlie, who wants to use his crypto assets as collateral to borrow stablecoins. He has a diverse portfolio:

```typescript
const charliePortfolio = {
  bitcoin: {
    amount: 0.5, // He has 0.5 BTC
    price: 25000, // BTC price is $25,000
    value: 12500, // Total value = $12,500
    maxLTV: 0.8, // Can borrow up to 80% of value
    liquidationLTV: 0.85, // Liquidation at 85% LTV
  },
  ethereum: {
    amount: 5, // He has 5 ETH
    price: 2000, // ETH price is $2,000
    value: 10000, // Total value = $10,000
    maxLTV: 0.75, // Can borrow up to 75% of value
    liquidationLTV: 0.8, // Liquidation at 80% LTV
  },
};
```

## Understanding Account Health

### 1. Total Collateral Value

First, let's calculate how much Charlie's collateral is worth:

```typescript
// Calculate total collateral value
const totalValue =
  charliePortfolio.bitcoin.value + charliePortfolio.ethereum.value;
// totalValue = $12,500 + $10,000 = $22,500

console.log("Charlie's total collateral value:", totalValue);
```

### 2. Maximum Borrowing Capacity

Now, let's see how much Charlie can safely borrow:

```typescript
// For each collateral:
// maxBorrow = value × maxLTV

Bitcoin max borrow = $12,500 × 0.8 = $10,000
Ethereum max borrow = $10,000 × 0.75 = $7,500

Total borrowing capacity = $17,500

// If Charlie borrows $15,000:
const charlieDebt = 15000;
```

### 3. Current Loan-to-Value (LTV)

Let's check Charlie's current LTV ratio:

```typescript
// Current LTV = Total Debt / Total Collateral Value
const currentLTV = charlieDebt / totalValue;
// currentLTV = $15,000 / $22,500 = 0.667 (66.7%)

console.log("Charlie's current LTV:", currentLTV);
```

### 4. Account Health Factor

The health factor tells us how close Charlie is to liquidation:

```typescript
// For each collateral:
// securedValue = value × liquidationLTV

Bitcoin secured value = $12,500 × 0.85 = $10,625
Ethereum secured value = $10,000 × 0.8 = $8,000

Total secured value = $18,625

// Health Factor = Total Secured Value / Current Debt
const healthFactor = 18625 / 15000 = 1.24

// Health interpretation:
if (healthFactor > 1) {
  console.log("Account is healthy");
} else {
  console.log("Account at risk of liquidation");
}
```

## Price Impact on Account Health

Let's see what happens when prices change:

### Scenario 1: BTC Price Drops 20%

```typescript
const btcPriceDrop = {
  bitcoin: {
    ...charliePortfolio.bitcoin,
    price: 20000, // 20% drop from $25,000
    value: 10000, // New value = 0.5 BTC × $20,000
  },
  ethereum: charliePortfolio.ethereum, // Unchanged
};

// New total value = $10,000 + $10,000 = $20,000
// New LTV = $15,000 / $20,000 = 0.75 (75%)

// New secured value:
// BTC: $10,000 × 0.85 = $8,500
// ETH: $10,000 × 0.8 = $8,000
// Total = $16,500

// New health factor = $16,500 / $15,000 = 1.1
// Getting closer to liquidation!
```

### Scenario 2: Both Assets Drop

```typescript
const marketCrash = {
  bitcoin: {
    ...charliePortfolio.bitcoin,
    price: 20000, // 20% drop
    value: 10000,
  },
  ethereum: {
    ...charliePortfolio.ethereum,
    price: 1500, // 25% drop
    value: 7500,
  },
};

// New total value = $10,000 + $7,500 = $17,500
// New LTV = $15,000 / $17,500 = 0.857 (85.7%)

// New secured value:
// BTC: $10,000 × 0.85 = $8,500
// ETH: $7,500 × 0.8 = $6,000
// Total = $14,500

// New health factor = $14,500 / $15,000 = 0.967
// Account is now at risk of liquidation!
```

## Risk Management Features

### 1. Weighted LTV Calculations

The protocol calculates maximum LTV based on collateral composition:

```typescript
// Weighted Max LTV = Σ(collateral_i.value × collateral_i.maxLTV) / total_value

const weightedMaxLTV = (
  (12500 × 0.8 + 10000 × 0.75) / 22500
) = 0.778 (77.8%)

// This means Charlie's absolute maximum borrow is:
const maxBorrow = 22500 × 0.778 = $17,500
```

### 2. Early Warning System

```typescript
// Define risk levels
const riskLevels = {
  SAFE: "Account is well collateralized",
  WARNING: "Getting close to liquidation threshold",
  DANGER: "Immediate action required",
};

function checkRiskLevel(healthFactor) {
  if (healthFactor >= 1.5) return riskLevels.SAFE;
  if (healthFactor >= 1.2) return riskLevels.WARNING;
  return riskLevels.DANGER;
}

// Charlie's initial risk: WARNING (health factor 1.24)
// After BTC drop: DANGER (health factor 1.1)
// After market crash: DANGER (health factor 0.967)
```

## Testing Account Health

Here are key scenarios to test:

```typescript
// Scenario 1: Single asset price drop
const singleAssetTest = {
  before: {
    totalValue: 22500,
    healthFactor: 1.24,
    status: "WARNING",
  },
  after: {
    totalValue: 20000,
    healthFactor: 1.1,
    status: "DANGER",
  },
};

// Scenario 2: Multiple asset price changes
const multiAssetTest = {
  collaterals: [
    { type: "BTC", drop: "20%", newValue: 10000 },
    { type: "ETH", drop: "25%", newValue: 7500 },
  ],
  expectedResults: {
    newTotalValue: 17500,
    newHealthFactor: 0.967,
    shouldBeLiquidatable: true,
  },
};

// Scenario 3: Gradual deterioration
const deteriorationTest = {
  stages: [
    { drop: "10%", healthFactor: 1.35, status: "SAFE" },
    { drop: "20%", healthFactor: 1.24, status: "WARNING" },
    { drop: "30%", healthFactor: 1.1, status: "DANGER" },
    { drop: "40%", healthFactor: 0.967, status: "LIQUIDATABLE" },
  ],
};
```

## Why This Design Works

1. **Risk-Weighted Approach**:

   - Different assets have different risk levels
   - LTV limits reflect asset volatility
   - Liquidation thresholds provide safety buffer

2. **Early Warning System**:

   - Multiple health check levels
   - Proactive risk management
   - Clear actionable thresholds

3. **Flexible Collateral Management**:
   ```typescript
   // Users can:
   - Add collateral to improve health
   - Remove excess collateral when safe
   - Manage different asset types independently
   ```

## Common Operations

1. **Adding Collateral**:

   ```typescript
   // Effect on health:
   newHealthFactor = (oldSecuredValue + newCollateralValue × liquidationLTV) / debt;
   ```

2. **Removing Collateral**:

   ```typescript
   // Check if removal is safe:
   const safeToRemove = remainingSecuredValue / debt >= 1.2; // 20% buffer
   ```

3. **Borrowing More**:
   ```typescript
   // Check if new borrow is safe:
   const safeToBorrow = totalSecuredValue / (currentDebt + newBorrow) >= 1.2;
   ```
