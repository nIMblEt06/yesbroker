import "server-only";
import postgres from "postgres";

declare global {
  var __baSql: postgres.Sql | undefined;
}

function create(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env, fill it in from your Supabase project settings, and restart."
    );
  }
  return postgres(url, { prepare: false, max: 10, idle_timeout: 20, connect_timeout: 10 });
}

function getInstance(): postgres.Sql {
  globalThis.__baSql ??= create();
  return globalThis.__baSql;
}

type SqlLike = postgres.Sql & ((strings: TemplateStringsArray, ...values: unknown[]) => unknown);

export const sql: postgres.Sql = new Proxy(function () {} as unknown as SqlLike, {
  apply(_target, _thisArg, args) {
    return Reflect.apply(getInstance() as unknown as (...a: unknown[]) => unknown, undefined, args);
  },
  get(_target, prop, receiver) {
    const value = Reflect.get(getInstance() as object, prop);
    return typeof value === "function" ? value.bind(getInstance()) : Reflect.get(getInstance(), prop, receiver);
  },
}) as unknown as postgres.Sql;
