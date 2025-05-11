import { PublicUserDTO } from "@entities/User";
import { PublicSession } from "@entities/Session";

export interface SignInResponse {
  user: PublicUserDTO;
  session: PublicSession;
}

export interface ErrorResponse {
  status: number;
  message: string;
  details?: any;
}
