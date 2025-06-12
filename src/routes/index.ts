import { Router } from "express";

import userRouter from "@routes/UserRoutes";
import authRouter from "@routes/AuthRoutes";
import serviceRouter from "@routes/ServiceRoutes";
import clientRouter from "@routes/ClientRoutes";
import appointmentRouter from "@routes/AppointmentRoutes";
import webhookRouter from "@routes/WebhooksRoutes";
console.log("Loading main API routes...");
console.log("API routes loaded successfully");
console.log("Initializing WEBHOOK ROUTER... " + webhookRouter);
const router = Router();

router.get("/", (_req, res) => {
  res.json({
    message: "API is running",
    status: "OK",
  });
});

router.use("/users", userRouter);
router.use("/auth", authRouter);
router.use("/services", serviceRouter);
router.use("/clients", clientRouter);
router.use("/appointments", appointmentRouter);
router.use("/webhooks", webhookRouter);

export default router;
