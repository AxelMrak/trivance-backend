export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  confirmedPassword: string;
  phone: string;
  address: string;
}

export interface ServiceRequest {
  name: string;
  description: string;
  price: number;
  duration: string;
}
