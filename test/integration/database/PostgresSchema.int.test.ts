import { dbClient } from "@config/db";

describe("PostgreSQL test schema", () => {
  it("connects to the test database with the normalized user schema", async () => {
    let result;

    try {
      result = await dbClient.query<{
        current_database: string;
        users_table: string | null;
        user_roles_table: string | null;
        users_role_column: string | null;
      }>(`
        SELECT
          current_database(),
          to_regclass('public.users') AS users_table,
          to_regclass('public.user_roles') AS user_roles_table,
          (
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name = 'role'
          ) AS users_role_column
      `);
    } catch (error) {
      throw new Error(
        `Test PostgreSQL is unavailable or misconfigured. Run npm run test:db from backend. Original error: ${String(error)}`,
      );
    }

    expect(result.rows[0]).toEqual({
      current_database: "trivance_db_test",
      users_table: "users",
      user_roles_table: "user_roles",
      users_role_column: null,
    });
  });
});
