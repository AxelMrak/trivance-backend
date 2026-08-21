import { EnvSchemaWithProdRules } from "@/config/env";

const VALID_PRODUCTION_ENV = {
  NODE_ENV: "production" as const,
  DATABASE_URL: "postgres://user:pass@db:5432/app",
  JWT_SECRET: "a".repeat(40),
  COOKIE_SECRET: "b".repeat(40),
  MP_ACCESS_TOKEN: "APP_USR_real_token_string",
  MP_WEBHOOK_SECRET: "c".repeat(20),
  SITE_URL: "https://app.example.com",
  COMPANY_ID: "company-uuid-1234",
  CORS_ORIGIN: "https://app.example.com",
};

describe("Config boundary — EnvSchema", () => {
  describe("Production fail-fast", () => {
    const requiredKeys: (keyof typeof VALID_PRODUCTION_ENV)[] = [
      "JWT_SECRET",
      "COOKIE_SECRET",
      "MP_ACCESS_TOKEN",
      "MP_WEBHOOK_SECRET",
      "SITE_URL",
      "COMPANY_ID",
      "CORS_ORIGIN",
    ];

    it.each(requiredKeys)("fails when %s is missing in production", (key) => {
      const env = { ...VALID_PRODUCTION_ENV, [key]: undefined };
      const result = EnvSchemaWithProdRules.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("fails when JWT_SECRET is shorter than 32 chars in production", () => {
      const env = { ...VALID_PRODUCTION_ENV, JWT_SECRET: "short" };
      const result = EnvSchemaWithProdRules.safeParse(env);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join(" ");
        expect(messages).toContain("32");
      }
    });

    it("fails when COOKIE_SECRET is shorter than 32 chars in production", () => {
      const env = { ...VALID_PRODUCTION_ENV, COOKIE_SECRET: "short" };
      const result = EnvSchemaWithProdRules.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("fails when MP_WEBHOOK_SECRET is shorter than 16 chars in production", () => {
      const env = { ...VALID_PRODUCTION_ENV, MP_WEBHOOK_SECRET: "short" };
      const result = EnvSchemaWithProdRules.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("fails when MP_ACCESS_TOKEN is empty in production", () => {
      const env = { ...VALID_PRODUCTION_ENV, MP_ACCESS_TOKEN: "" };
      const result = EnvSchemaWithProdRules.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("fails when SITE_URL is localhost in production", () => {
      const env = { ...VALID_PRODUCTION_ENV, SITE_URL: "http://localhost" };
      const result = EnvSchemaWithProdRules.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("fails when DATABASE_URL is the fallback default in production", () => {
      const env = {
        ...VALID_PRODUCTION_ENV,
        DATABASE_URL: "postgres://postgres:postgres@trivance-db:5432/trivance_db",
      };
      const result = EnvSchemaWithProdRules.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("succeeds when all production requirements are met", () => {
      const result = EnvSchemaWithProdRules.safeParse(VALID_PRODUCTION_ENV);
      expect(result.success).toBe(true);
    });
  });

  describe("NODE_ENV validation", () => {
    it("fails on an unknown NODE_ENV value (e.g. typo 'produciton')", () => {
      const result = EnvSchemaWithProdRules.safeParse({
        ...VALID_PRODUCTION_ENV,
        NODE_ENV: "produciton",
      });
      expect(result.success).toBe(false);
    });

    it("accepts 'development' without production-only requirements", () => {
      const result = EnvSchemaWithProdRules.safeParse({
        NODE_ENV: "development",
        DATABASE_URL: "postgres://user:pass@localhost:5432/app",
        JWT_SECRET: "dev-secret",
      });
      expect(result.success).toBe(true);
    });

    it("accepts 'test' without production-only requirements", () => {
      const result = EnvSchemaWithProdRules.safeParse({
        NODE_ENV: "test",
        DATABASE_URL: "postgres://user:pass@localhost:5432/test",
        JWT_SECRET: "test-secret",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("DATABASE_URL validation", () => {
    it("fails on a non-postgres URL (http://...)", () => {
      const result = EnvSchemaWithProdRules.safeParse({
        NODE_ENV: "development",
        DATABASE_URL: "http://localhost:5432/db",
        JWT_SECRET: "dev",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join(" ");
        expect(messages).toMatch(/postgres/i);
      }
    });

    it("fails on a non-URL string", () => {
      const result = EnvSchemaWithProdRules.safeParse({
        NODE_ENV: "development",
        DATABASE_URL: "not-a-url-at-all",
        JWT_SECRET: "dev",
      });
      expect(result.success).toBe(false);
    });

    it("accepts postgres:// protocol", () => {
      const result = EnvSchemaWithProdRules.safeParse({
        NODE_ENV: "development",
        DATABASE_URL: "postgres://user:pass@localhost:5432/db",
        JWT_SECRET: "dev",
      });
      expect(result.success).toBe(true);
    });

    it("accepts postgresql:// protocol", () => {
      const result = EnvSchemaWithProdRules.safeParse({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        JWT_SECRET: "dev",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Secret non-leakage in error messages", () => {
    it("does not include the secret value in the error when JWT_SECRET is too short", () => {
      const secretValue = "my-super-secret-value-that-should-not-leak";
      const env = { ...VALID_PRODUCTION_ENV, JWT_SECRET: secretValue.slice(0, 5) };
      const result = EnvSchemaWithProdRules.safeParse(env);
      expect(result.success).toBe(false);
      if (!result.success) {
        const allErrorText = JSON.stringify(result.error.issues);
        expect(allErrorText).not.toContain(secretValue.slice(0, 5));
      }
    });

    it("does not include the secret value in the error when COOKIE_SECRET is missing", () => {
      const cookieSecret = "another-secret-that-must-not-appear-in-errors";
      const env = { ...VALID_PRODUCTION_ENV, COOKIE_SECRET: cookieSecret.slice(0, 5) };
      const result = EnvSchemaWithProdRules.safeParse(env);
      expect(result.success).toBe(false);
      if (!result.success) {
        const allErrorText = JSON.stringify(result.error.issues);
        expect(allErrorText).not.toContain(cookieSecret.slice(0, 5));
      }
    });

    it("does not include the access token in the error when MP_ACCESS_TOKEN is empty", () => {
      const env = { ...VALID_PRODUCTION_ENV, MP_ACCESS_TOKEN: "" };
      const result = EnvSchemaWithProdRules.safeParse(env);
      expect(result.success).toBe(false);
      if (!result.success) {
        const allErrorText = JSON.stringify(result.error.issues);
        expect(allErrorText).toContain("MP_ACCESS_TOKEN");
      }
    });
  });

  describe("Type coercion", () => {
    it("coerces PORT string to number", () => {
      const result = EnvSchemaWithProdRules.safeParse({
        ...VALID_PRODUCTION_ENV,
        PORT: "8080",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.PORT).toBe("number");
        expect(result.data.PORT).toBe(8080);
      }
    });

    it("rejects a non-numeric PORT", () => {
      const result = EnvSchemaWithProdRules.safeParse({
        ...VALID_PRODUCTION_ENV,
        PORT: "not-a-number",
      });
      expect(result.success).toBe(false);
    });
  });
});
