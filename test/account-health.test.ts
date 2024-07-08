import { calculateAccountHealth } from "../src/functions";
import { Collateral } from "../src/types";

describe('calculateAccountHealth', () => {
  const createCollateral = (amount: number, price: number, liquidationLTV: number): Collateral => ({
    amount,
    price,
    liquidationLTV,
  });

  test('calculates account health correctly with single collateral', () => {
    const collaterals = [createCollateral(100, 10, 0.8)];
    const currentDebt = 500;

    const health = calculateAccountHealth(collaterals, currentDebt);

    // Expected account health: (100 * 10 * 0.8) / 500 = 1.6
    expect(health).toBe(1.6);
  });

  test('calculates account health correctly with multiple collaterals', () => {
    const collaterals = [
      createCollateral(100, 10, 0.8),
      createCollateral(200, 5, 0.7),
      createCollateral(50, 20, 0.9),
    ];
    const currentDebt = 1000;

    const health = calculateAccountHealth(collaterals, currentDebt);

    // Expected account health: (100 * 10 * 0.8 + 200 * 5 * 0.7 + 50 * 20 * 0.9) / 1000 = 2.4
    expect(health).toBe(2.4);
  });

  test('returns error when debt is zero', () => {
    const collaterals = [createCollateral(100, 10, 0.8)];
    const currentDebt = 0;

    expect(() => calculateAccountHealth(collaterals, currentDebt)).toThrow('Current debt cannot be zero.');
  });

  test('returns zero when no collaterals are provided', () => {
    const collaterals: Collateral[] = [];
    const currentDebt = 1000;

    const health = calculateAccountHealth(collaterals, currentDebt);

    expect(health).toBe(0);
  });

  test('handles collaterals with zero amount or price', () => {
    const collaterals = [
      createCollateral(0, 10, 0.8),
      createCollateral(100, 0, 0.8),
      createCollateral(100, 10, 0.8),
    ];
    const currentDebt = 500;

    const health = calculateAccountHealth(collaterals, currentDebt);

    // Expected health: (100 * 10 * 0.8) / 500 = 1.6
    expect(health).toBe(1.6);
  });

  test('throws error when liquidationLTV is undefined', () => {
    const collaterals = [{
      amount: 100,
      price: 10,
      // liquidationLTV is intentionally omitted
    }] as Collateral[];
    const currentDebt = 500;

    expect(() => calculateAccountHealth(collaterals, currentDebt)).toThrow('Liquidity LTV is not defined');
  });

  test('calculates correct health for underwater account', () => {
    const collaterals = [createCollateral(100, 10, 0.8)];
    const currentDebt = 1000;

    const health = calculateAccountHealth(collaterals, currentDebt);

    // Expected health: (100 * 10 * 0.8) / 1000 = 0.8
    expect(health).toBe(0.8);
  });
});
