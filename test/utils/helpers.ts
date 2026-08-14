import jwt from "jsonwebtoken";

import { config } from "@config/constants";
import { getTestAgent } from "@test/setup";

export const signInAndGetToken = async (email: string, password: string) => {
  const res = await getTestAgent().post("/auth/sign-in").send({ email, password });
  const setCookie = res.headers["set-cookie"]?.[0] || "";
  const token = /token=([^;]+)/.exec(setCookie)?.[1] || "";
  return token;
};

export const generateToken = (userId: string, role: number, companyId: string) => {
  const token = jwt.sign({ userId, role, company_id: companyId }, config.JWT_SECRET, {
    expiresIn: "24h",
  });
  return token;
};
