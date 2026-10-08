import "server-only";
import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

export function getSql() {
  if (client) return client;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  // Fail fast when a direct (non-pooler) URL is used in serverless/prod.
  // Supavisor transaction mode (:6543) + prepare:false is required per README.
  if (process.env.VERCEL === "1" && !/:(6543)\//.test(connectionString)) {
    console.warn("[db] DATABASE_URL should use Supavisor pooler :6543 in Vercel/IPv4");
  }

  client = postgres(connectionString, {
    ssl: "require",
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });

  return client;
}
