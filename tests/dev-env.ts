import { config } from "dotenv";

// Loads .env and refuses to continue unless it points at the Development project.
export function loadDevEnv(): void {
  config({ path: ".env", quiet: true });
  if (process.env.SUPABASE_ENV !== "development") {
    throw new Error("Tests run only against Supabase Development (set SUPABASE_ENV=development in .env)");
  }
}
