import { getTestAgent } from "@test/setup";

export const signInAndGetToken = async (email: string, password: string) => {
  const res = await getTestAgent().post("/auth/sign-in").send({ email, password });
  const setCookie = res.headers["set-cookie"]?.[0] || "";
  const token = /token=([^;]+)/.exec(setCookie)?.[1] || "";
  return token;
};

