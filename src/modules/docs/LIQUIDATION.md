# Understanding Multi-Collateral Liquidation

Let's understand how liquidation works in Granite protocol through a real-world example.

## The Story

Meet Alice, a borrower who has deposited multiple cryptocurrencies as collateral:

```typescript
const alicePosition = {
  bitcoin: {
    amount: 0.04, // She has 0.04 BTC
    price: 25000, // BTC price is $25,000
    value: 1000, // Total value = $1,000
    liquidationLTV: 0.78, // Protocol trusts 78% of BTC value
    liquidationPremium: 0.1, // 10% premium for liquidators
  },
  ethereum: {
    amount: 0.332, // She has 0.332 ETH
    price: 2000, // ETH price is $2,000
    value: 664, // Total value = $664
    liquidationLTV: 0.7, // Protocol trusts 70% of ETH value
    liquidationPremium: 0.12, // 12% premium for liquidators
  },
};

// Alice borrowed $1,014 against her collateral
const aliceDebt = 1014;
```

## How Safe is Alice's Position?

To understand if Alice's position is safe, we need to calculate its "secured value":

```typescript
// For each collateral:
// securedValue = value x liquidationLTV

Bitcoin secured value = $1,000 x 0.78 = $780
Ethereum secured value = $664 x 0.7 = $464.80

Total secured value = $780 + $464.80 = $1,244.80
```

Since Alice's debt ($1,014) is less than the secured value ($1,244.80), her position is over-collateralized.

## Enter Bob the Liquidator

Bob notices ETH price drops to $1,800. Let's see if he can liquidate Alice's ETH position:

```typescript
// New ETH value = 0.332 x $1,800 = $597.60
// New ETH secured value = $597.60 x 0.7 = $418.32

// New total secured value:
Bitcoin secured value = $780 (unchanged)
ETH secured value = $418.32 (decreased)
Total = $1,198.32

// Position is still over-collateralized:
Debt = $1,014 < Secured Value = $1,198.32
```

### How Much Can Bob Liquidate?

Let's use our formula:

```typescript
maxRepayCalc = (debt - totalSecuredValue) / (1 - (1 + premium) x liquidationLTV)

// For ETH:
maxRepayCalc = (1014 - 1198.32) / (1 - (1 + 0.12) x 0.7)
             = -184.32 / 0.216
             = -853.33
```

Since maxRepayCalc is negative, Bob cannot liquidate yet!

## Price Drops Further

Now ETH price drops to $1,500:

```typescript
// New ETH value = 0.332 x $1,500 = $498
// New ETH secured value = $498 x 0.7 = $348.60

// New total secured value:
Bitcoin secured value = $780 (unchanged)
ETH secured value = $348.60 (decreased)
Total = $1,128.60

// Now position is under-collateralized:
Debt = $1,014 > Secured Value = $1,128.60
```

### Bob's Opportunity

Now Bob can liquidate:

```typescript
// For ETH:
maxRepayCalc = (1014 - 1128.60) / (1 - (1 + 0.12) x 0.7)
             = -114.60 / 0.216
             = -530.56

// But we also check collateral cap:
collateralCap = ETH value / (1 + premium)
              = 498 / 1.12
              = 444.64

// Final amount Bob can repay:
maxRepayAllowed = max(min(maxRepayCalc, collateralCap), 0)
                = 444.64
```

### What Bob Gets

If Bob decides to repay $444.64 of Alice's debt:

```typescript
// Collateral Bob receives:
collateralToTransfer = (repayAmount + repayAmount x premium) / price
                     = (444.64 + 444.64 x 0.12) / 1500
                     = 498 / 1500
                     = 0.332 ETH

// Bob's profit:
Value received = 0.332 ETH x $1,500 = $498
Amount paid = $444.64
Profit = $53.36 (12% premium)
```

## After Liquidation

Alice's position after Bob's liquidation:

```typescript
// Remaining debt:
Original debt = $1,014
Repaid by Bob = $444.64
Remaining debt = $569.36

// Remaining collateral:
Bitcoin = 0.04 BTC (worth $1,000)
ETH = 0 (liquidated)

// New secured value:
Bitcoin secured value = $1,000 x 0.78 = $780
> Remaining debt ($569.36)
// Position is now healthy again!
```

## Why This Design Works

1. **Fair for Everyone**:

   - Alice: Her debt is reduced when collateral value falls
   - Bob: Makes profit for maintaining protocol health
   - Protocol: Remains solvent with healthy positions

2. **Independent Collateral Liquidation**:

   ```typescript
   // Even if BTC position is super healthy:
   BTC secured value = $780
   // ETH can still be liquidated if its price drops too much
   ```

3. **Premium Incentives**:
   ```typescript
   // Liquidator profit increases with amount repaid:
   profit = repayAmount x premium
   // Example: $444.64 x 0.12 = $53.36
   ```

## Common Scenarios

1. **Healthy Position**:

   ```typescript
   debt < totalSecuredValue;
   // Result: maxRepayCalc is negative, no liquidation possible
   ```

2. **Unhealthy Position**:

   ```typescript
   debt > totalSecuredValue;
   // Result: maxRepayCalc is positive, liquidation possible up to collateral cap
   ```

3. **Mixed Collateral Health**:
   ```typescript
   // Even if:
   btcValue x btcLiqLTV > debt
   // ETH can still be liquidated if:
   ethValue drops significantly
   ```

## Testing Your Implementation

Use these real-world scenarios to test:

```typescript
// Scenario 1: Price drop
const priceDropTest = {
  before: { ethPrice: 2000, canLiquidate: false },
  after: { ethPrice: 1500, canLiquidate: true },
};

// Scenario 2: Multiple collaterals
const multiCollateralTest = {
  btc: { amount: 0.04, price: 25000, liqLTV: 0.78 },
  eth: { amount: 0.332, price: 2000, liqLTV: 0.7 },
  debt: 1014,
};

// Scenario 3: Different premiums
const premiumTest = {
  stablecoin: { premium: 0.05 }, // 5% for stable
  volatile: { premium: 0.15 }, // 15% for volatile
};
```
