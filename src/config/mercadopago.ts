import { MercadoPagoConfig } from "mercadopago";

import { config } from "@config/env";

export const mercadoPagoClient = new MercadoPagoConfig({
  accessToken: config.MP_ACCESS_TOKEN,
});
