import type { Metadata } from "next";
import postgres from "postgres";
import { sql } from "@/lib/db";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { fetchAreaChips } from "@/lib/queries";
import { AdminList, type AdminBrokerRow } from "@/components/admin/AdminList";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

type RawRow = Record<string, unknown>;
type DbParam = postgres.ParameterOrJSON<never>;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "reports";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  if (!adminConfigured()) {
    return (
      <Notice>
        Set <code>ADMIN_PASSWORD</code> in your environment to enable the admin view.
      </Notice>
    );
  }
  if (!(await isAdmin())) return <LoginForm />;

  const baseSelect = sql`
    select b.id, b.phone, b.display_name,
           b.notes, b.helpful_votes, b.report_count,
           b.is_hidden, b.is_deleted, b.has_name_conflict,
           coalesce(jsonb_agg(distinct jsonb_build_object('slug', a.slug, 'name', a.name))
                    filter (where a.id is not null), '[]') as areas
    from brokers b
    left join broker_areas ba on ba.broker_id = b.id
    left join areas a on a.id = ba.area_id
  `;

  let rows: AdminBrokerRow[] = [];
  let reportNotes: Record<number, string[]> = {};

  if (tab === "reports") {
    const res = await sql`${baseSelect} where b.report_count > 0 and not b.is_deleted group by b.id order by b.report_count desc limit 200`;
    rows = res.map(mapAdmin);
    const details = await sql`
      select r.broker_id, r.reason, r.note
      from reports r join brokers b on b.id = r.broker_id
      order by r.created_at desc limit 500
    `;
    reportNotes = details.reduce<Record<number, string[]>>((acc, r) => {
      const label = `${r.reason}${r.note ? `: ${r.note}` : ""}`;
      (acc[Number(r.broker_id)] ??= []).push(label);
      return acc;
    }, {});
  } else if (tab === "hidden") {
    const res = await sql`${baseSelect} where b.is_hidden and not b.is_deleted group by b.id order by b.last_added_at desc limit 200`;
    rows = res.map(mapAdmin);
  } else if (tab === "conflicts") {
    const res = await sql`${baseSelect} where b.has_name_conflict and not b.is_deleted group by b.id order by b.last_added_at desc limit 200`;
    rows = res.map(mapAdmin);
  } else if (q) {
    const like = `%${q}%`;
    const digits = q.replace(/\D/g, "");
    const params: DbParam[] = [];
    const p = (v: DbParam) => `$${params.push(v)}`;
    const parts = [
      `b.display_name ilike ${p(like)}`,
      `b.phone ilike ${p(like)}`,
      `b.notes ilike ${p(like)}`,
    ];
    if (digits.length >= 3) parts.push(`b.phone like ${p("%" + digits + "%")}`);
    const res = await sql.unsafe(
      `select b.id, b.phone, b.display_name,
              b.notes, b.helpful_votes, b.report_count,
              b.is_hidden, b.is_deleted, b.has_name_conflict,
              coalesce(jsonb_agg(distinct jsonb_build_object('slug', a.slug, 'name', a.name))
                       filter (where a.id is not null), '[]') as areas
       from brokers b
       left join broker_areas ba on ba.broker_id = b.id
       left join areas a on a.id = ba.area_id
       where not b.is_deleted and (${parts.join(" or ")})
       group by b.id order by b.last_added_at desc limit 200`,
      params
    );
    rows = res.map(mapAdmin);
  } else {
    const res = await sql`${baseSelect} where not b.is_deleted group by b.id order by b.last_added_at desc limit 200`;
    rows = res.map(mapAdmin);
  }

  const areas = await fetchAreaChips();

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Moderation</h1>
        <form action="/admin" className="flex gap-2">
          <input type="hidden" name="tab" value="all" />
          <input name="q" defaultValue={q} placeholder="Search all brokers…" className="field h-9 w-56 text-sm" />
          <button className="btn btn-outline btn-sm">Search</button>
        </form>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {(
          [
            ["reports", `Reported (${rows.length})`],
            ["hidden", "Hidden"],
            ["conflicts", "Name conflicts"],
            ["all", "All"],
          ] as const
        ).map(([key, label]) => (
          <a
            key={key}
            href={`/admin?tab=${key}`}
            className="chip"
            data-active={tab === key || (key === "all" && !["reports", "hidden", "conflicts"].includes(tab))}
          >
            {label}
          </a>
        ))}
      </nav>

      <AdminList rows={rows} allAreas={areas} reportNotes={reportNotes} />
    </div>
  );
}

function mapAdmin(r: RawRow): AdminBrokerRow {
  return {
    id: Number(r.id),
    phone: String(r.phone),
    displayName: (r.display_name as string | null) ?? null,
    aliases: (r.aliases as string[] | null) ?? [],
    notes: (r.notes as string | null) ?? "",
    helpfulVotes: Number(r.helpful_votes),
    reportCount: Number(r.report_count),
    isHidden: Boolean(r.is_hidden),
    hasNameConflict: Boolean(r.has_name_conflict),
    areas: (r.areas as { slug: string; name: string }[]) ?? [],
  };
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="broker-card mx-auto mt-10 max-w-md p-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}
