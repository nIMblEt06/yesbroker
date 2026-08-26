"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import {
  ADMIN_COOKIE,
  adminConfigured,
  adminToken,
  checkLoginAllowed,
  isAdmin,
} from "@/lib/admin";

export interface LoginResult {
  error?: string;
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  if (!adminConfigured()) return { error: "Admin is not configured. Set ADMIN_PASSWORD." };
  if (!(await checkLoginAllowed())) {
    return { error: "Too many attempts. Try again later." };
  }
  const password = String(formData.get("password") ?? "");
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: "Wrong password." };
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  revalidatePath("/admin");
  return {};
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  revalidatePath("/admin");
}

async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Not authorized");
}

export async function setHidden(brokerId: number, hidden: boolean): Promise<void> {
  await requireAdmin();
  await sql`update brokers set is_hidden = ${hidden} where id = ${brokerId}`;
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function softDeleteBroker(brokerId: number): Promise<void> {
  await requireAdmin();
  await sql`update brokers set is_deleted = true where id = ${brokerId}`;
  revalidatePath("/admin");
  revalidatePath("/");
}

export interface BrokerEditInput {
  id: number;
  displayName: string | null;
  notes: string;
  areaSlugs: string[];
}

export async function saveBrokerEdit(input: BrokerEditInput): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const name = input.displayName?.trim() || null;

  await sql.begin(async (tx) => {
    await tx`
      update brokers set
        display_name = ${name},
        notes = ${input.notes ?? ""},
        has_name_conflict = false
      where id = ${input.id}
    `;
    await tx`delete from broker_areas where broker_id = ${input.id}`;
    for (const slug of input.areaSlugs) {
      await tx`
        insert into broker_areas (broker_id, area_id)
        select ${input.id}, id from areas where slug = ${slug}
        on conflict do nothing
      `;
    }
  });

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}
