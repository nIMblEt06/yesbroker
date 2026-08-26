import type { Metadata } from "next";
import { fetchAreaChips } from "@/lib/queries";
import { normalizePhone } from "@/lib/phone";
import { AddForms } from "@/components/AddForms";
import { InstallHint } from "@/components/InstallHint";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add a broker",
  description:
    "Add a rental broker to the YesBroker directory, one at a time or paste a whole list.",
};

function param(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const areaParam = typeof sp.area === "string" ? sp.area : undefined;
  const phoneParam = (() => {
    const raw = param(sp, "phone");
    if (!raw) return undefined;
    return normalizePhone(raw) ?? undefined;
  })();
  const nameParam = param(sp, "name")?.slice(0, 120);
  const notesParam = param(sp, "notes")?.slice(0, 300);
  const textParam = param(sp, "text")?.slice(0, 10000);
  const shareFailed = param(sp, "shareFailed") === "1";
  const areas = await fetchAreaChips();
  return (
    <div className="py-4">
      {shareFailed && (
        <p className="mx-auto mb-4 max-w-xl rounded-[4px] border border-warn bg-warn-soft px-3 py-2 text-center text-sm text-warn">
          Couldn&apos;t read that shared contact. Try sharing it as text instead, or add it manually below.
        </p>
      )}
      <AddForms
        areas={areas}
        prefillAreaSlug={areaParam}
        prefillPhone={phoneParam}
        prefillName={nameParam}
        prefillNotes={notesParam}
        sharedText={textParam}
      />
      <InstallHint />
      <p className="mx-auto mt-4 max-w-xl text-center text-xs text-muted">
        By adding, you confirm this number belongs to a broker and isn&apos;t private.
      </p>
    </div>
  );
}
