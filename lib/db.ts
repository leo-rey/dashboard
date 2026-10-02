import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

export function getSql() {
  if (client) return client;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  client = postgres(connectionString, {
    ssl: "require",
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });

  return client;
}
