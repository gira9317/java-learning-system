import { request } from "./client";

export type User = {
  id: string;
  employeeNo: string;
  name: string;
  role: "user" | "admin";
  mustChangePassword: boolean;
};

export interface LoginProps {
  employeeNo: string;
  password: string;
  rememberMe: boolean;
}

export interface ChangePasswordProps {
  currentPassword: string;
  newPassword: string;
}

// POST /auth/login
export async function login(props: LoginProps): Promise<void> {
  await request("/auth/login", { method: "POST", body: props });
}

// POST /auth/logout
export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
}

// GET /auth/me（未サインインなら ApiError 401）
export async function getMe(options: { cookie?: string } = {}): Promise<User> {
  const { user } = await request<{ user: User }>("/auth/me", options);
  return user;
}

// POST /auth/password
export async function changePassword(props: ChangePasswordProps): Promise<void> {
  await request("/auth/password", { method: "POST", body: props });
}
