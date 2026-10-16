export type Role = "user" | "admin";

/** サインイン中のユーザー（authMiddleware が c.set("user") する） */
export type AuthUser = {
  id: string;
  employeeNo: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  sessionId: string;
};

/** Hono に渡す型。ルートで c.get("user") を型付きで使えるようにする */
export type AppEnv = {
  Variables: {
    user: AuthUser;
  };
};
