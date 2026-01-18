import { Context, Next } from "hono";
import { extractToken, verifyToken } from "../utils/auth";
import { getDb } from "../db";
import type { User, JwtPayload } from "../types/user";

// 扩展 Context 类型以包含用户信息
declare module "hono" {
  interface ContextVariableMap {
    user: User;
    jwtPayload: JwtPayload;
  }
}

/**
 * 认证中间件
 * 验证 JWT Token 并将用户信息挂载到 context
 */
export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");
  const token = extractToken(authHeader);

  if (!token) {
    return c.json(
      {
        code: 401,
        message: "请先登录",
      },
      401
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    return c.json(
      {
        code: 401,
        message: "登录已过期，请重新登录",
      },
      401
    );
  }

  // 从数据库获取用户信息
  const db = getDb();
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(payload.userId) as User | undefined;

  if (!user) {
    return c.json(
      {
        code: 401,
        message: "用户不存在",
      },
      401
    );
  }

  // 将用户信息挂载到 context
  c.set("user", user);
  c.set("jwtPayload", payload);

  await next();
};

/**
 * 可选认证中间件
 * 如果提供了 token 则验证，否则继续执行
 */
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");
  const token = extractToken(authHeader);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const db = getDb();
      const user = db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(payload.userId) as User | undefined;

      if (user) {
        c.set("user", user);
        c.set("jwtPayload", payload);
      }
    }
  }

  await next();
};
