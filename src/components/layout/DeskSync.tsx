import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadDesk, saveDesk } from "@/lib/desk/account";
import { useModel } from "@/lib/store";

export function DeskSync() {
  const { user, isPending } = useCurrentUserState();
  const hydrate = useModel((s) => s.hydrate);
  const ticker = useModel((s) => s.ticker);
  const scenario = useModel((s) => s.scenario);
  const growth = useModel((s) => s.growth);
  const grossMargin = useModel((s) => s.grossMargin);
  const wacc = useModel((s) => s.wacc);
  const tgr = useModel((s) => s.tgr);
  const taxRate = useModel((s) => s.taxRate);
  const nSims = useModel((s) => s.nSims);
  const note = useModel((s) => s.note);
  const ready = useRef(false);
  const owner = useRef<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      ready.current = false;
      owner.current = null;
      return;
    }
    if (owner.current === user.id && ready.current) return;
    owner.current = user.id;
    ready.current = false;
    let cancelled = false;
    void loadDesk()
      .then((row) => {
        if (cancelled) return;
        if (row) hydrate(row);
        ready.current = true;
      })
      .catch(() => {
        if (!cancelled) ready.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [user, isPending, hydrate]);

  useEffect(() => {
    if (!user || !ready.current) return;
    const t = window.setTimeout(() => {
      void saveDesk({
        data: {
          ticker,
          scenario,
          growth,
          grossMargin,
          wacc,
          tgr,
          taxRate,
          nSims,
          note,
        },
      }).catch(() => {});
    }, 700);
    return () => window.clearTimeout(t);
  }, [user, ticker, scenario, growth, grossMargin, wacc, tgr, taxRate, nSims, note]);

  return null;
}
