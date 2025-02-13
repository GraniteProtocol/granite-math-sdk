# Understanding LP Rewards

Let's understand how LP rewards work in Granite protocol through a real-world example.

## The Story

Meet Frank, who has been providing liquidity to the protocol and wants to understand how his additional rewards are calculated. The protocol has an epoch-based rewards system:

```typescript
const currentEpoch = {
  startTimestamp: 1677609600, // March 1, 2023 00:00:00 UTC
  endTimestamp: 1680288000, // April 1, 2023 00:00:00 UTC
  totalRewards: 100000, // 100,000 tokens to distribute
  targetAPR: 0.1, // 10% target APR
  cap: 1000000, // $1M cap for rewards
};

// Frank's position over time
const franksSnapshots = [
  {
    timestamp: 1677609600, // Start of epoch
    userLpShares: 5000, // Frank has 5,000 LP shares
    totalLpShares: 100000, // Total LP shares in protocol
  },
  {
    timestamp: 1678214400, // March 8 (After 1 week)
    userLpShares: 7500, // Frank added more liquidity
    totalLpShares: 120000, // Total shares also increased
  },
  {
    timestamp: 1679424000, // March 22 (After 2 more weeks)
    userLpShares: 7500, // No change
    totalLpShares: 150000, // More LPs joined
  },
  {
    timestamp: 1680288000, // End of epoch
    userLpShares: 7500, // Final position
    totalLpShares: 180000, // Final total shares
  },
];
```

## Understanding Epoch-Based Rewards

### Step 1: Calculating Time Weights

First, let's see how Frank's rewards are weighted by time:

```typescript
// Epoch duration in seconds
const epochDuration = currentEpoch.endTimestamp - currentEpoch.startTimestamp;
// = 2,678,400 seconds (31 days)

// Calculate each period's weight
const periods = [];

// Period 1: March 1-8 with 5,000 shares
periods.push({
  duration: 1678214400 - 1677609600, // 604,800 seconds (7 days)
  sharePercentage: 5000 / 100000, // 5% of total shares
  epochPercentage: 604800 / 2678400, // 22.58% of epoch
  weightedReward: 100000 * (604800 / 2678400) * (5000 / 100000),
  // = 100,000 * 0.2258 * 0.05 = 1,129 tokens
});

// Period 2: March 8-22 with 7,500 shares
periods.push({
  duration: 1679424000 - 1678214400, // 1,209,600 seconds (14 days)
  sharePercentage: 7500 / 120000, // 6.25% of total shares
  epochPercentage: 1209600 / 2678400, // 45.16% of epoch
  weightedReward: 100000 * (1209600 / 2678400) * (7500 / 120000),
  // = 100,000 * 0.4516 * 0.0625 = 2,822.5 tokens
});

// Period 3: March 22-April 1 with 7,500 shares
periods.push({
  duration: 1680288000 - 1679424000, // 864,000 seconds (10 days)
  sharePercentage: 7500 / 150000, // 5% of total shares
  epochPercentage: 864000 / 2678400, // 32.26% of epoch
  weightedReward: 100000 * (864000 / 2678400) * (7500 / 150000),
  // = 100,000 * 0.3226 * 0.05 = 1,613 tokens
});
```

### Step 2: Total Rewards Calculation

Now let's calculate Frank's total rewards:

```typescript
function calculateEarnedRewards(epoch, snapshots) {
  let totalRewards = 0;

  // For each period between snapshots
  for (let i = 1; i < snapshots.length; i++) {
    const prevSnapshot = snapshots[i - 1];
    const snapshot = snapshots[i];

    // Calculate period's percentage of epoch
    const periodDuration = snapshot.timestamp - prevSnapshot.timestamp;
    const percentOfEpoch = periodDuration / epochDuration;

    // Calculate user's share percentage during this period
    const percentOfShares = snapshot.userLpShares / snapshot.totalLpShares;

    // Calculate rewards for this period
    const periodRewards = epoch.totalRewards * percentOfEpoch * percentOfShares;
    totalRewards += periodRewards;
  }

  return totalRewards;
}

const franksRewards = calculateEarnedRewards(currentEpoch, franksSnapshots);
// = 1,129 + 2,822.5 + 1,613 = 5,564.5 tokens
```

## Reward Rate Mechanics

Let's understand how the reward rate is determined:

```typescript
function calculateTotalRewards(epoch) {
  const epochDuration = epoch.endTimestamp - epoch.startTimestamp;

  // Convert target APR to epoch duration
  const epochRewardRate = epoch.targetAPR * (epochDuration / secondsInYear);

  // Calculate total rewards based on cap
  return epochRewardRate * epoch.cap;
}

// Example calculations:
const rewardScenarios = {
  smallEpoch: {
    duration: "7 days",
    targetAPR: 0.1,
    cap: 1000000,
    rewards: 1000000 * 0.1 * ((7 * 24 * 3600) / secondsInYear),
    // ≈ 1,917.81 tokens
  },
  standardEpoch: {
    duration: "30 days",
    targetAPR: 0.1,
    cap: 1000000,
    rewards: 1000000 * 0.1 * ((30 * 24 * 3600) / secondsInYear),
    // ≈ 8,219.18 tokens
  },
};
```

## Common Reward Scenarios

### 1. Consistent LP

```typescript
const consistentLpExample = {
  behavior: "Maintained constant position",
  advantages: {
    predictable: "Steady reward accrual",
    simple: "Easy to calculate expected rewards",
    efficient: "No gas costs from position changes",
  },
  example: {
    shares: 5000,
    duration: "Full epoch",
    expectedRewards: "Proportional share of epoch rewards",
  },
};
```

### 2. Dynamic LP

```typescript
const dynamicLpExample = {
  behavior: "Actively managed position",
  considerations: {
    timing: "Rewards weighted by time and share amount",
    strategy: "Can optimize for high reward periods",
    costs: "Must consider gas costs of position changes",
  },
  example: {
    initialShares: 5000,
    increased: "to 7500 during epoch",
    rewardImpact: "Higher rewards after increase",
  },
};
```

### 3. Late Entry

```typescript
const lateEntryExample = {
  behavior: "Joined mid-epoch",
  implications: {
    rewards: "Proportional to time in epoch",
    strategy: "Can plan entry around epoch schedule",
    nextEpoch: "Full participation in next epoch",
  },
};
```

## Why This Design Works

1. **Fair Distribution**:

   ```typescript
   // Rewards are:
   - Proportional to share of liquidity
   - Weighted by time in epoch
   - Independent of deposit/withdrawal timing
   ```

2. **Predictable Emissions**:

   ```typescript
   // Each epoch has:
   - Fixed total rewards
   - Known duration
   - Clear start and end times
   ```

3. **Flexible Participation**:
   ```typescript
   // Users can:
   - Join/leave at any time
   - Adjust positions mid-epoch
   - Easily calculate expected rewards
   ```

## Testing Your Implementation

```typescript
// Test 1: Basic Reward Calculation
const basicRewardTest = {
  scenario: {
    userShares: 5000,
    totalShares: 100000,
    duration: "Full epoch",
    expectedReward: 5000, // 5% of 100,000
  },
};

// Test 2: Multiple Snapshots
const snapshotTest = {
  snapshots: [
    { time: "start", shares: 5000, total: 100000 },
    { time: "mid", shares: 7500, total: 120000 },
    { time: "end", shares: 7500, total: 150000 },
  ],
  expectedTotal: 5564.5,
};

// Test 3: Edge Cases
const edgeCaseTest = {
  cases: [
    {
      description: "Single LP in epoch",
      shares: 1000,
      totalShares: 1000,
      expectedReward: "100% of epoch rewards",
    },
    {
      description: "Zero shares",
      shares: 0,
      totalShares: 100000,
      expectedReward: 0,
    },
    {
      description: "Very short duration",
      duration: "1 second",
      expectedReward: "Properly prorated amount",
    },
  ],
};
```
