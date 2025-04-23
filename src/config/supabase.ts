import { createClient } from "@supabase/supabase-js";
import { config } from "./constants";

export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
