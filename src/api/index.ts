import express from "express";

import MessageResponse from "../interfaces/MessageResponse";
import emojis from "./emojis";
import { randomUUID } from "crypto";

const router = express.Router();
const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get<{}, MessageResponse>("/", (_req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.post<{}, any>("/users/new-user", (req, res) => {
  const { name, email, password, companyID } = req.body;

  if (!email || !regexEmail.test(email)) {
    return res.status(400).json({
      error: "Email is required",
    });
  }

  res.status(201).json({
    user: {
      ...req.body,
      id: randomUUID(),
      role: 1,
    },
  });
});

router.use("/emojis", emojis);

export default router;
