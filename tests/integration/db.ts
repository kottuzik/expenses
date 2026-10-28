import { Client } from "pg";

// Runs fn inside a transaction that is always rolled back: lets tests build
// states like "only one category left" without changing Development data.
export async function inRollback<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    // Supabase's pooler certificate is not in Node's default trust store.
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  try {
    await db.query("begin");
    return await fn(db);
  } finally {
    await db.query("rollback").catch(() => undefined);
    await db.end();
  }
}

// Expects the statement to fail and returns the PostgreSQL error message.
export async function failure(db: Client, sql: string, params: unknown[] = []): Promise<string> {
  await db.query("savepoint attempt");
  try {
    await db.query(sql, params);
  } catch (error) {
    await db.query("rollback to savepoint attempt");
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error(`Expected failure: ${sql}`);
}
