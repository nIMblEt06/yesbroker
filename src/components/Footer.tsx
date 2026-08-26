import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-line bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Contacts are shared by other users and aren&apos;t verified. Use your own
          judgement.
        </p>
        <p className="flex gap-4">
          <Link href="/about" className="hover:text-brand-strong">
            About
          </Link>
          <a href="mailto:hello@yesbroker.xyz" className="hover:text-brand-strong">
            Contact
          </a>
        </p>
      </div>
    </footer>
  );
}
