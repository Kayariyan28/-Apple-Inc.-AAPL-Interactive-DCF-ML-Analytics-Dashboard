import { useMemo } from "react";
import { CURRENT_PRICE } from "./constants";
import { calibrateMarket } from "./calibrate";
import { useMarket, useTapePrice } from "@/lib/market/use-tape";

export function useCalibration() {
  const market = useMarket();
  const tape = useTapePrice();
  return useMemo(() => calibrateMarket(market, tape || CURRENT_PRICE), [market, tape]);
}
