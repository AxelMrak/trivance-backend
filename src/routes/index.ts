import { Router } from "express";

import userRouter from "@routes/UserRoutes";
import authRouter from "@routes/AuthRoutes";
import serviceRouter from "@routes/ServiceRoutes";
import clientRouter from "@routes/ClientRoutes";
import appointmentRouter from "@routes/AppointmentRoutes";
import webhookRouter from "@routes/WebhooksRoutes";
import orderRouter from "@routes/OrderRoutes";
import statsRouter from "@routes/StatsRoutes";
import searchRouter from "@routes/SearchRoutes";
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
router.use("/orders", orderRouter);
router.use("/stats", statsRouter);
router.use("/search", searchRouter);

export default router;
