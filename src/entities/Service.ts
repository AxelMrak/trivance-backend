export interface Service {
  id: string; // UUID
  company_id: string; // UUID FK
  name: string;
  description?: string;
  duration: string;
  price?: string; // numeric(10,2) as string
  requires_deposit: boolean;
  created_at: string;
}
