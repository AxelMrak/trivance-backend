import jwt from "jsonwebtoken";

import { createUser } from "@test/utils/factories";
import { signInAndGetToken } from "@test/utils/helpers";
import { config } from "@config/env";

describe("Auth tenant context", () => {
  it("sign in token carries the user company id", async () => {
    const user = await createUser();
    const token = await signInAndGetToken(user.email, (user as any).plainPassword);
    const payload = jwt.verify(token, config.JWT_SECRET) as { company_id?: string };

    expect(payload.company_id).toBe(user.company_id);
  });
});
