import type { ReactNode } from "react";
import { Kicker } from "@/components/ui/panel";

export function PageHeader({ kicker, title, lede }: { kicker: string; title: string; lede: string }) {
  return (
    <header className="mx-auto max-w-7xl px-4 pb-8 pt-10 md:px-6 md:pt-14">
      <Kicker>{kicker}</Kicker>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl font-medium tracking-tight md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{lede}</p>
    </header>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-16 md:px-6">{children}</div>;
}
