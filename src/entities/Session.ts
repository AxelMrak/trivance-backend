export interface Session {
  id: string;
  user_id: string;
  token: string;
  user_agent: string;
  ip_address: string;
  created_at: Date;
}

export interface PublicSession {
  token: string;
  expiresIn: number;
}
