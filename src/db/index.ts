import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { config } from "../config";
import { initSchema } from "./schema";

let db: Database.Database | null = null;

/**
 * 获取数据库实例
 */
export const getDb = (): Database.Database => {
  if (!db) {
    // 确保数据库目录存在
    const dbDir = path.dirname(config.DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 创建数据库连接
    db = new Database(config.DB_PATH);

    // 启用 WAL 模式以提高性能
    db.pragma("journal_mode = WAL");

    // 初始化表结构
    initSchema(db);

    console.log(`📦 数据库已连接: ${config.DB_PATH}`);
  }
  return db;
};

/**
 * 关闭数据库连接
 */
export const closeDb = (): void => {
  if (db) {
    db.close();
    db = null;
    console.log("📦 数据库连接已关闭");
  }
};

export default getDb;
