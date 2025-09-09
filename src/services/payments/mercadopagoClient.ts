import { Payment } from "mercadopago";

import { mercadoPagoClient } from "@/config/mercadopago";

export const getPaymentResource = () => new Payment(mercadoPagoClient);
