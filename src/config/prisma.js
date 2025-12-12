import { defineConfig } from "@prisma/config";

export default defineConfig({
  database: {
    provider: "postgresql",
    connectionString: process.env.DATABASE_URL,
  },
});
