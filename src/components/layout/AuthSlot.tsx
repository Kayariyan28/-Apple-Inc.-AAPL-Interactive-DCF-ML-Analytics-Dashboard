import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="size-8 shrink-0 animate-pulse rounded-full bg-secondary" aria-hidden />;
  }
  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex h-9 shrink-0 items-center rounded-full bg-secondary px-3.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
      >
        Sign in
      </Link>
    );
  }
  return <UserButton />;
}
