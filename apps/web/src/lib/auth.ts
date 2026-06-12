import { betterAuth } from "better-auth";
import { kyselyAdapter } from "@better-auth/kysely-adapter";
import { Kysely } from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { createClient } from "@libsql/client";

const db = new Kysely({
  dialect: new LibsqlDialect({
    client: createClient({
      url: process.env.DATABASE_URL || "",
      authToken: process.env.DATABASE_AUTH_TOKEN,
    }) as any,
  })
});

export const auth = betterAuth({
    trustHost: true,
    database: kyselyAdapter(db, {
        type: "sqlite",
    }),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
});
