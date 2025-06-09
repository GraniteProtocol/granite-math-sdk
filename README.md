# Granite Math SDK

A comprehensive SDK for interacting with Granite Protocol's smart contracts. This library provides utility functions for calculating positions, liquidations, rewards, and more.

## Table of Contents

1. [Installation](#installation)
2. [Account Management](#account-management)
3. [Borrowing & Lending](#borrowing--lending)
4. [Liquidations](#liquidations)
5. [Liquidity Provider (LP) Functions](#liquidity-provider-functions)
6. [LP Rewards](#lp-rewards)
7. [Daily Caps](#daily-caps)

## Installation

```bash
npm install granite-math-sdk
```

## Account Management

Functions for managing and monitoring account health and positions.

### Account Health

```typescript
import {
  calculateAccountHealth,
  calculateAccountLTV,
  calculateAccountMaxLTV,
  calculateAccountLiqLTV,
  calculateTotalCollateralValue,
  calculateMaxWithdrawAmount,
} from "granite-math-sdk";

// Get total value of collateral
const totalValue = calculateTotalCollateralValue(collaterals);

// Check account health (> 1 is healthy, < 1 needs attention)
const healthFactor = calculateAccountHealth(collaterals, currentDebt);

// Get current LTV ratio
const currentLTV = calculateAccountLTV(totalDebt, collaterals);

// Get maximum allowed LTV
const maxLTV = calculateAccountMaxLTV(collaterals);

// Get liquidation threshold LTV
const liqLTV = calculateAccountLiqLTV(collaterals);

// Calculate maximum amount that can be withdrawn for a specific collateral
const maxWithdraw = calculateMaxWithdrawAmount(
  collateralToWithdraw,
  allCollaterals,
  debtShares,
  openInterest,
  totalDebtShares,
  totalAssets,
  irParams,
  timeDelta,
  decimals,
  futureDeltaSeconds, // Optional: seconds to add for future debt calculation (default: 600)
);
```

**When to use:**

- Monitor position health
- Check if close to liquidation
- Calculate available borrowing capacity
- Calculate maximum withdrawal amounts
- Assess risk levels

## Borrowing & Lending

Functions for calculating borrowing capacity, interest rates, and debt conversions.

### Borrowing Calculations

```typescript
import {
  calculateBorrowCapacity,
  userAvailableToBorrow,
  calculateBorrowAPY,
  convertDebtAssetsToShares,
  convertDebtSharesToAssets,
} from "granite-math-sdk";

// Check how much you can borrow
const borrowCapacity = calculateBorrowCapacity(collaterals);
const availableToBorrow = userAvailableToBorrow(
  collaterals,
  freeLiquidity,
  reserveBalance,
  currentDebt,
);

// Get current borrow APY
const borrowAPY = calculateBorrowAPY(utilizationRate, irParams);

// Convert between debt shares and assets
const debtShares = convertDebtAssetsToShares(
  debtAssets,
  totalDebtShares,
  totalAssets,
  openInterest,
  protocolReservePercentage,
  irParams,
  timeDelta,
);

const debtAssets = convertDebtSharesToAssets(
  debtShares,
  openInterest,
  totalDebtShares,
  totalAssets,
  irParams,
  timeDelta,
);
```

**When to use:**

- Before taking a loan to check capacity
- To monitor borrowing costs
- To convert between debt shares and actual debt amounts

## Liquidations

Functions for liquidators to calculate opportunities and rewards.

### Liquidation Calculations

```typescript
import {
  liquidatorMaxRepayAmount,
  calculateCollateralToTransfer,
} from "granite-math-sdk";

// Check if and how much can be liquidated
const maxRepay = liquidatorMaxRepayAmount(
  debtShares,
  openInterest,
  totalDebtShares,
  totalAssets,
  irParams,
  timeDelta,
  collateralToLiquidate,
  allCollaterals,
);

if (maxRepay > 0) {
  // Calculate collateral you'll receive
  const collateralToReceive = calculateCollateralToTransfer(
    maxRepay,
    collateralToLiquidate,
  );

  // Calculate expected profit
  const profit = collateralToReceive * collateralToLiquidate.price - maxRepay;
}
```

**When to use:**

- To check if a position can be liquidated
- To calculate liquidation profitability
- To determine how much collateral you'll receive

## Liquidity Provider Functions

Functions for liquidity providers to manage their positions.

### LP Calculations

```typescript
import {
  convertLpAssetsToShares,
  convertLpSharesToAssets,
  calculateLpAPY,
  computeTotalEarning,
} from "granite-math-sdk";

// Convert between LP tokens and underlying assets
const lpShares = convertLpAssetsToShares(
  assets,
  totalShares,
  totalAssets,
  openInterest,
  protocolReservePercentage,
  irParams,
  timeDelta,
);

const assets = convertLpSharesToAssets(
  shares,
  totalShares,
  totalAssets,
  openInterest,
  protocolReservePercentage,
  irParams,
  timeDelta,
);

// Check current APY
const apy = calculateLpAPY(
  utilizationRate,
  irParams,
  protocolReservePercentage,
);

// Calculate earnings
const earnings = computeTotalEarning(
  shares,
  totalShares,
  totalAssets,
  openInterest,
  protocolReservePercentage,
  irParams,
  reserveBalance,
  timeDelta,
);
```

**When to use:**

- When providing or removing liquidity
- To track earnings
- To evaluate LP returns

## LP Rewards

Functions for calculating liquidity provider rewards.

## Daily Caps

Functions for managing daily caps on LPs, collateral withdrawal and borrowing.

### Reward Calculations

```typescript
import { earnedRewards, totalLpRewards } from "granite-math-sdk";

// Calculate rewards for current epoch
const rewards = earnedRewards(epoch, snapshots);

// Calculate total rewards for all LPs
const totalRewards = totalLpRewards(epoch);
```

**When to use:**

- To track earned rewards
- To calculate expected rewards
- To monitor reward distribution

## Types

Common types used throughout the SDK:

```typescript
interface Collateral {
  amount: number;
  price: number;
  maxLTV?: number;
  liquidationLTV?: number;
  liquidationPremium?: number;
}

interface InterestRateParams {
  slope1: number;
  slope2: number;
  baseIR: number;
  urKink: number;
}

interface Epoch {
  startTimestamp: number;
  endTimestamp: number;
  totalRewards: number;
  targetAPR: number;
  cap: number;
}

interface Snapshot {
  timestamp: number;
  userLpShares: number;
  totalLpShares: number;
}
```

## Error Handling

Most functions will throw errors if required parameters are undefined or invalid. Always wrap SDK calls in try-catch blocks:

```typescript
try {
  const result = someSDKFunction(params);
} catch (error) {
  console.error("SDK Error:", error.message);
}
```

Common errors to handle:

- "LiquidationLTV is not defined"
- "MaxLTV is not defined"
- "Current debt cannot be zero"
- "Insufficient data to compute rewards"
- "Invalid epoch duration"
