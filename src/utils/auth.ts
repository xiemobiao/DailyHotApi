import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config";
import type { JwtPayload } from "../types/user";

const SALT_ROUNDS = 10;

/**
 * 加密密码
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * 验证密码
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * 生成 JWT Token
 */
export const generateToken = (payload: Omit<JwtPayload, "iat" | "exp">): string => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as SignOptions);
};

/**
 * 验证 JWT Token
 */
export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
};

/**
 * 从 Authorization header 中提取 token
 */
export const extractToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;

  // 支持 "Bearer <token>" 格式
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // 直接返回 token
  return authHeader;
};
