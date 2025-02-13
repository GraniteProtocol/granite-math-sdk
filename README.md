# Granite math library

Utility functions for any frontend connecting to Granite smart contracts.

## Multi-collateral Liquidation Mechanics

The Granite protocol supports multi-collateral positions, where users can deposit multiple different types of collateral assets to back their loans. This document explains how liquidation works in such cases.

### Key Concepts

1. **Liquidation LTV (liqLTV)**: The threshold at which a position becomes eligible for liquidation
2. **Liquidation Premium (liqDiscount)**: The reward percentage given to liquidators
3. **Secured Value**: The value of collateral adjusted by its liquidation LTV

### Real-World Example

Let's understand this with a real cryptocurrency scenario:

A borrower has deposited three different cryptocurrencies as collateral:

```typescript
const position = {
  bitcoin: {
    amount: 0.04, // BTC
    price: 25000, // $25,000/BTC
    value: 1000, // Total value = $1,000
    liquidationLTV: 0.78, // 78%
    liquidationPremium: 0.1, // 10% premium
  },
  ethereum: {
    amount: 0.332, // ETH
    price: 2000, // $2,000/ETH
    value: 664, // Total value = $664
    liquidationLTV: 0.7, // 70%
    liquidationPremium: 0.12, // 12% premium
  },
  solana: {
    amount: 35, // SOL
    price: 10, // $10/SOL
    value: 350, // Total value = $350
    liquidationLTV: 0.6, // 60%
    liquidationPremium: 0.15, // 15% premium
  },
  debt: 1014, // Borrowed $1,014
};
```

#### Position Analysis

1. **Calculate Total Secured Value**:

   ```typescript
   Secured Value =
     (Bitcoin value × BTC liqLTV) +
     (ETH value × ETH liqLTV) +
     (SOL value × SOL liqLTV)
   = ($1,000 × 0.78) + ($664 × 0.70) + ($350 × 0.60)
   = $780 + $464.80 + $210
   = $1,247.80
   ```

2. **Liquidation Scenario - ETH**:

   A liquidator wants to liquidate the ETH position:

   ```typescript
   ETH Value = $664
   Maximum Repay = $664 / (1 + 0.12) ≈ $592.86

   If liquidator repays $592.86:
   - They get ETH worth: $592.86 + ($592.86 × 0.12) = $664
   - They receive: 0.332 ETH
   - Their profit: $71.14 (12% premium)
   ```

3. **Post-Liquidation State**:

   ```typescript
   Original debt: $1,014
   Debt repaid: $592.86
   Remaining debt: $421.14

   Remaining collateral:
   - Bitcoin: $1,000
   - Solana: $350
   Total: $1,350
   ```

#### Important Insights

1. **Individual Collateral Liquidation**: Even though the position is over-collateralized (secured value > debt), liquidators can still liquidate individual collaterals if they're willing to repay debt at the premium rate.

2. **Win-Win Situation**:

   - Borrower's debt reduces significantly
   - Remaining collateral still provides good coverage
   - Liquidator makes a profit through the premium
   - Protocol becomes more secure

3. **Premium Mechanics**: The liquidation premium (e.g., 12% for ETH) creates an incentive for liquidators while ensuring the borrower's position isn't liquidated at full market value.

### Technical Implementation

The liquidation mechanics are implemented through several key formulas:

1. **Maximum Repay Calculation**:

   ```typescript
   maxRepayCalc_x = (debt - Σ(value_i × liqLTV_i)) / (1 - (1 + liqDiscount_x) × liqLTV_x)
   ```

   Where:

   - `debt` is the total debt including accrued interest
   - `Σ(value_i × liqLTV_i)` is the sum of secured values from all collaterals
   - `liqDiscount_x` is the liquidation premium for collateral x
   - `liqLTV_x` is the liquidation LTV for collateral x

2. **Maximum Allowed Repay**:

   ```typescript
   maxRepayAllowed_x = max(
     min(maxRepayCalc_x, collValue_x / (1 + liqDiscount_x)),
     0
   );
   ```

   Where:

   - `collValue_x` is the current value of collateral x (amount × price)
   - The `min` ensures liquidator cannot repay more than collateral value adjusted for premium
   - The `max` ensures no negative repay amounts

3. **Liquidation Reward**:

   ```typescript
   liqReward_x = repayAmt_x × liqDiscount_x
   ```

   - Reward is proportional to the amount being repaid
   - Each collateral can have different premium rates

4. **Collateral to Transfer**:
   ```typescript
   collToTransfer_x = (repayAmt_x + liqReward_x) / collPrice_x;
   ```
   - Determines how much collateral the liquidator receives
   - Includes both the repaid amount and the liquidation reward

### Important Implementation Notes

1. **Over-collateralized Positions**:

   - When `debt < Σ(value_i × liqLTV_i)`, `maxRepayCalc` will be negative
   - This results in `maxRepayAllowed = 0`
   - No liquidation is possible while the position is over-collateralized

2. **Under-collateralized Positions**:

   - When `debt > Σ(value_i × liqLTV_i)`, `maxRepayCalc` will be positive
   - The actual repay amount will be capped by `collValue_x/(1 + liqDiscount_x)`
   - This ensures liquidators can't extract more value than available

3. **Individual Collateral Liquidation**:
   - Each collateral is evaluated independently
   - Different collaterals can have different LTVs and premiums
   - The total secured value considers all collaterals

### Code Example

```typescript
// Calculate maximum repayment allowed for collateral B
const amtB = liquidatorMaxRepayAmount(
  debtShares,
  openInterest,
  totalDebtShares,
  totalAssets,
  irParams,
  timeDelta,
  collateralB,
  [collateralA, collateralB, collateralC]
);

// If liquidation possible, calculate collateral to receive
if (amtB > 0) {
  const collateralToReceive = calculateCollateralToTransfer(amtB, collateralB);
}
```

This implementation ensures:

1. Liquidations only occur when positions are under-collateralized
2. Liquidators can't extract more value than the collateral is worth
3. Each collateral type can have its own risk parameters
4. The system remains solvent through proper reward calculations

### Multi-collateral Example

Consider a position with three collateral assets:

```typescript
const position = {
  collateralA: {
    amount: 100,
    price: 10, // Total value = 1000
    liquidationLTV: 0.78, // 78%
    liquidationPremium: 0.1, // 10%
  },
  collateralB: {
    amount: 664,
    price: 1, // Total value = 664
    liquidationLTV: 0.7, // 70%
    liquidationPremium: 0.12, // 12%
  },
  collateralC: {
    amount: 350,
    price: 1, // Total value = 350
    liquidationLTV: 0.6, // 60%
    liquidationPremium: 0.15, // 15%
  },
  debt: 1014,
};
```

### How Liquidation Works

1. **Calculate Total Secured Value**

   ```typescript
   totalSecuredValue = Σ(value_i × liqLTV_i)
   // = (1000 × 0.78) + (664 × 0.70) + (350 × 0.60)
   // = 780 + 464.8 + 210
   // = 1247.8
   ```

2. **For Each Collateral (x), Calculate Maximum Repay**

   ```typescript
   maxRepayCalc_x = (debt - totalSecuredValue) / (1 - (1 + liqDiscount_x) × liqLTV_x)
   ```

   For collateral A:

   ```typescript
   denominator = 1 - (1 + 0.10) × 0.78 = 0.142
   maxRepayCalc = (1014 - 1247.8) / 0.142 = -1645.77
   ```

3. **Apply Collateral Cap**

   ```typescript
   collateralCap = collateralValue / (1 + liqDiscount);
   maxRepayAllowed = max(min(maxRepayCalc, collateralCap), 0);
   ```

   For collateral A:

   ```typescript
   collateralCap = 1000 / 1.1 = 909.09
   maxRepayAllowed = max(min(-1645.77, 909.09), 0) = 0
   ```

4. **Calculate Liquidation Reward**

   ```typescript
   liqReward = repayAmt × liqDiscount
   ```

5. **Calculate Collateral to Transfer**
   ```typescript
   collToTransfer = (repayAmt + liqReward) / collPrice;
   ```

### Example Scenarios

1. **Over-collateralized Position**

   - If debt < totalSecuredValue, maxRepayCalc will be negative
   - Results in maxRepayAllowed = 0
   - No liquidation possible

2. **Under-collateralized Position**
   - If debt > totalSecuredValue, maxRepayCalc will be positive
   - Liquidator can repay up to min(maxRepayCalc, collateralCap)
   - Receives collateral worth (repayAmt × (1 + liqDiscount))

### Important Notes

1. **Independent Liquidation**: Each collateral can be liquidated independently
2. **Liquidator Choice**: Liquidators can choose which collateral to receive
3. **Premium Variation**: Different collaterals can have different liquidation premiums
4. **Cap Protection**: The collateral cap ensures liquidators can't drain more value than available
