import Link from "next/link";
import { HouseMark } from "@/components/Logo";

export function Header() {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <HouseMark className="h-7 w-7 text-ink" />
          <span className="font-display text-sm uppercase tracking-wide">YesBroker</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/about" className="btn btn-outline btn-sm hidden sm:inline-flex">
            About
          </Link>
          <Link href="/add" className="btn btn-primary btn-sm hidden sm:inline-flex">
            + Add broker
          </Link>
        </nav>
      </div>
    </header>
  );
}
