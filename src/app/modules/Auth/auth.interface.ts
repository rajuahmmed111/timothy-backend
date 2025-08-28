export type ILoginResponse = {
  accessToken: string;
  refreshToken: string;
    user?: {
    fcmToken?: string | null;
  };
};


export interface ILoginRequest {
  email: string;
  password: string;
  fcmToken?: string;
}