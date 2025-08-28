export type ILoginResponse = {
  accessToken: string;
  refreshToken: string;
    user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    fcmToken?: string;
  };
};


export interface ILoginRequest {
  email: string;
  password: string;
  fcmToken?: string;
}