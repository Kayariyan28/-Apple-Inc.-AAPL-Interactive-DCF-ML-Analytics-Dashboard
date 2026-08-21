import { createFileRoute } from "@tanstack/react-router";
import { Desk } from "@/components/term/Desk";

export const Route = createFileRoute("/term")({ component: TermPage });

function TermPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Desk />
    </main>
  );
}
