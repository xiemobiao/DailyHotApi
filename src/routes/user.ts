import { Hono } from "hono";
import { getDb } from "../db";
import { hashPassword, comparePassword, generateToken } from "../utils/auth";
import { authMiddleware } from "../middleware/auth";
import type {
  User,
  UserPublic,
  RegisterRequest,
  LoginRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "../types/user";

const userRouter = new Hono();

// 邮箱格式验证
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 密码强度验证（至少 6 位）
const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

// 将用户信息转换为公开信息（移除密码）
const toUserPublic = (user: User): UserPublic => {
  const { password, ...publicInfo } = user;
  return publicInfo;
};

/**
 * 用户注册
 * POST /user/register
 */
userRouter.post("/register", async (c) => {
  try {
    const body = await c.req.json<RegisterRequest>();
    const { email, password, nickname } = body;

    // 参数验证
    if (!email || !password) {
      return c.json({ code: 400, message: "邮箱和密码不能为空" }, 400);
    }

    if (!isValidEmail(email)) {
      return c.json({ code: 400, message: "邮箱格式不正确" }, 400);
    }

    if (!isValidPassword(password)) {
      return c.json({ code: 400, message: "密码长度至少 6 位" }, 400);
    }

    const db = getDb();

    // 检查邮箱是否已存在
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (existingUser) {
      return c.json({ code: 400, message: "该邮箱已被注册" }, 400);
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const result = db
      .prepare(
        "INSERT INTO users (email, password, nickname) VALUES (?, ?, ?)"
      )
      .run(email, hashedPassword, nickname || null);

    // 获取创建的用户
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(result.lastInsertRowid) as User;

    return c.json({
      code: 200,
      message: "注册成功",
      data: toUserPublic(user),
    });
  } catch (error) {
    console.error("注册错误:", error);
    return c.json({ code: 500, message: "注册失败，请稍后重试" }, 500);
  }
});

/**
 * 用户登录
 * POST /user/login
 */
userRouter.post("/login", async (c) => {
  try {
    const body = await c.req.json<LoginRequest>();
    const { email, password } = body;

    // 参数验证
    if (!email || !password) {
      return c.json({ code: 400, message: "邮箱和密码不能为空" }, 400);
    }

    const db = getDb();

    // 查找用户（统一错误信息，避免暴露用户是否存在）
    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as User | undefined;

    if (!user) {
      return c.json({ code: 401, message: "邮箱或密码错误" }, 401);
    }

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return c.json({ code: 401, message: "邮箱或密码错误" }, 401);
    }

    // 生成 token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return c.json({
      code: 200,
      message: "登录成功",
      data: {
        token,
        user: toUserPublic(user),
      },
    });
  } catch (error) {
    console.error("登录错误:", error);
    return c.json({ code: 500, message: "登录失败，请稍后重试" }, 500);
  }
});

/**
 * 获取当前用户信息
 * GET /user/profile
 */
userRouter.get("/profile", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({
    code: 200,
    data: toUserPublic(user),
  });
});

/**
 * 更新用户信息
 * PUT /user/profile
 */
userRouter.put("/profile", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json<UpdateProfileRequest>();
    const { nickname, avatar } = body;

    const db = getDb();

    // 构建更新语句
    const updates: string[] = [];
    const params: any[] = [];

    if (nickname !== undefined) {
      updates.push("nickname = ?");
      params.push(nickname);
    }

    if (avatar !== undefined) {
      updates.push("avatar = ?");
      params.push(avatar);
    }

    if (updates.length === 0) {
      return c.json({ code: 400, message: "没有要更新的内容" }, 400);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(user.id);

    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(
      ...params
    );

    // 获取更新后的用户信息
    const updatedUser = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(user.id) as User;

    return c.json({
      code: 200,
      message: "更新成功",
      data: toUserPublic(updatedUser),
    });
  } catch (error) {
    console.error("更新用户信息错误:", error);
    return c.json({ code: 500, message: "更新失败，请稍后重试" }, 500);
  }
});

/**
 * 修改密码
 * PUT /user/password
 */
userRouter.put("/password", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json<ChangePasswordRequest>();
    const { oldPassword, newPassword } = body;

    // 参数验证
    if (!oldPassword || !newPassword) {
      return c.json({ code: 400, message: "请输入旧密码和新密码" }, 400);
    }

    if (!isValidPassword(newPassword)) {
      return c.json({ code: 400, message: "新密码长度至少 6 位" }, 400);
    }

    // 验证旧密码
    const isOldPasswordValid = await comparePassword(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return c.json({ code: 400, message: "旧密码错误" }, 400);
    }

    // 加密新密码
    const hashedNewPassword = await hashPassword(newPassword);

    const db = getDb();
    db.prepare(
      "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(hashedNewPassword, user.id);

    return c.json({
      code: 200,
      message: "密码修改成功",
    });
  } catch (error) {
    console.error("修改密码错误:", error);
    return c.json({ code: 500, message: "修改密码失败，请稍后重试" }, 500);
  }
});

/**
 * 登出（可选，前端清除 token 即可）
 * POST /user/logout
 */
userRouter.post("/logout", authMiddleware, async (c) => {
  // 服务端无状态，只需返回成功
  // 实际的登出操作由前端清除 token 完成
  return c.json({
    code: 200,
    message: "登出成功",
  });
});

export default userRouter;
