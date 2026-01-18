/**
 * 用户基础信息
 */
export interface User {
  id: number;
  email: string;
  password: string;
  nickname: string | null;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 用户公开信息（不包含密码）
 */
export interface UserPublic {
  id: number;
  email: string;
  nickname: string | null;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * JWT Payload
 */
export interface JwtPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * 注册请求
 */
export interface RegisterRequest {
  email: string;
  password: string;
  nickname?: string;
}

/**
 * 登录请求
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  token: string;
  user: UserPublic;
}

/**
 * 更新用户信息请求
 */
export interface UpdateProfileRequest {
  nickname?: string;
  avatar?: string;
}

/**
 * 修改密码请求
 */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

/**
 * 用户设置
 */
export interface UserSettings {
  id: number;
  user_id: number;
  settings_json: string | null;
  updated_at: string;
}
