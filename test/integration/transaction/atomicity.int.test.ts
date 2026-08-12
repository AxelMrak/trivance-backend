import { OrderRepository } from "@/repositories/OrderRepository";
import { dbClient, transaction } from "@/config/db";
import { createAppointment } from "@test/utils/factories";

/**
 * Proves transaction semantics against a real PostgreSQL instance.
 * Requires .env.test + a running database (CI runs `npm run test:int`).
 */
describe("transaction atomicity (real DB)", () => {
  const orderRepository = new OrderRepository();

  test("commits order creation and reference update together", async () => {
    const appointment = await createAppointment();
    let orderId: string | undefined;

    // Mirrors AppointmentService.createPaymentLink local-state flow: create the
    // order with a temporary reference, then set the stable reference to its id.
    await transaction(async (db) => {
      const order = await orderRepository.create(
        {
          appointment_id: appointment.id,
          status: "pending",
          provider: "mercadopago",
          reference_id: "temp-ref-" + Date.now(),
        },
        db,
      );
      orderId = order.id;
      await orderRepository.update(order.id, { reference_id: order.id }, db);
    });

    const { rows } = await dbClient.query("SELECT * FROM orders WHERE id = $1", [orderId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].reference_id).toBe(orderId);
  });

  test("leaves no order rows when the second mutation fails (unique violation)", async () => {
    const appointment = await createAppointment();
    const duplicateRef = "dup-ref-" + Date.now();

    // Use raw SQL inside the transaction so the pg error code propagates
    // unmasked (BaseRepository.create rewrites errors as a generic message and
    // would drop the `code`). Asserting the unique-violation code proves the
    // failure happened between the first and second mutation — not before.
    await expect(
      transaction(async (db) => {
        // First mutation succeeds...
        await db.query(
          "INSERT INTO orders (appointment_id, provider, reference_id) VALUES ($1, $2, $3)",
          [appointment.id, "mercadopago", duplicateRef],
        );
        // ...second one violates the unique reference_id index -> ROLLBACK
        await db.query(
          "INSERT INTO orders (appointment_id, provider, reference_id) VALUES ($1, $2, $3)",
          [appointment.id, "mercadopago", duplicateRef],
        );
      }),
    ).rejects.toMatchObject({ code: "23505" });

    const { rows } = await dbClient.query("SELECT id FROM orders WHERE reference_id = $1", [
      duplicateRef,
    ]);
    // Both inserts were rolled back: no partial row survives the failure
    expect(rows).toHaveLength(0);
  });
});