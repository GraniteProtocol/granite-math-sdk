import { Collateral, InterestRateParams } from "../types";
import { convertDebtSharesToAssets } from "./debt";

export const liquidatorMaxRepayAmount = (
  debtShares: number,
  openInterest: number,
  totalDebtShares: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number,
  collateral: Collateral
) => {
  if (!collateral.liquidationLTV || !collateral.liquidationPremium)
    throw new Error("Liquidation LTV or liquidation premium are not defined");
  const debtAssets = convertDebtSharesToAssets(
    debtShares,
    openInterest,
    totalDebtShares,
    totalAssets,
    irParams,
    timeDelta
  );
  const collateralValue = collateral.amount * collateral.price;

  return (
    (debtAssets - collateralValue * collateral.liquidationLTV) /
    (1 - (1 + collateral.liquidationPremium) * collateral.liquidationLTV)
  );
};
