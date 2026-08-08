import { getTestAgent } from "@test/setup";

describe("Orders Endpoints - Basic", () => {
  it("POST /orders/:id/demo-confirm • removed endpoint • returns 404", async () => {
    const orderId = "123e4567-e89b-12d3-a456-426614174000";

    const res = await getTestAgent().post(`/orders/${orderId}/demo-confirm`);

    expect(res.status).toBe(404);
  });
});
