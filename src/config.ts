import dotenv from "dotenv";

// 环境变量
dotenv.config();

export type Config = {
  PORT: number;
  DISALLOW_ROBOT: boolean;
  CACHE_TTL: number;
  REQUEST_TIMEOUT: number;
  ALLOWED_DOMAIN: string;
  ALLOWED_HOST: string;
  USE_LOG_FILE: boolean;
  RSS_MODE: boolean;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_DB: number;
  ZHIHU_COOKIE: string;
  WEIBO_COOKIE: string;
  FILTER_WEIBO_ADVERTISEMENT: boolean;
  // AI 相关配置
  AI_ENABLED: boolean;
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL: string;
  OPENAI_MODEL: string;
  AI_CACHE_TTL: number;
  AI_MAX_TOKENS: number;
  AI_TEMPERATURE: number;
};

// 验证并提取环境变量
const getEnvVariable = (key: string): string | undefined => {
  const value = process.env[key];
  if (value === undefined) return undefined;
  return value;
};

// 将环境变量转换为数值
const getNumericEnvVariable = (key: string, defaultValue: number): number => {
  const value = getEnvVariable(key) ?? String(defaultValue);
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) return defaultValue;
  return parsedValue;
};

// 将环境变量转换为布尔值
const getBooleanEnvVariable = (key: string, defaultValue: boolean): boolean => {
  const value = getEnvVariable(key) ?? String(defaultValue);
  return value.toLowerCase() === "true";
};

// 创建配置对象
export const config: Config = {
  PORT: getNumericEnvVariable("PORT", 6688),
  DISALLOW_ROBOT: getBooleanEnvVariable("DISALLOW_ROBOT", true),
  CACHE_TTL: getNumericEnvVariable("CACHE_TTL", 3600),
  REQUEST_TIMEOUT: getNumericEnvVariable("REQUEST_TIMEOUT", 6000),
  ALLOWED_DOMAIN: getEnvVariable("ALLOWED_DOMAIN") || "*",
  ALLOWED_HOST: getEnvVariable("ALLOWED_HOST") || "imsyy.top",
  USE_LOG_FILE: getBooleanEnvVariable("USE_LOG_FILE", true),
  RSS_MODE: getBooleanEnvVariable("RSS_MODE", false),
  REDIS_HOST: getEnvVariable("REDIS_HOST") || "127.0.0.1",
  REDIS_PORT: getNumericEnvVariable("REDIS_PORT", 6379),
  REDIS_PASSWORD: getEnvVariable("REDIS_PASSWORD") || "",
  REDIS_DB:  getNumericEnvVariable("REDIS_DB", 0),
  ZHIHU_COOKIE: getEnvVariable("ZHIHU_COOKIE") || "",
  WEIBO_COOKIE: getEnvVariable("WEIBO_COOKIE") || "",
  FILTER_WEIBO_ADVERTISEMENT: getBooleanEnvVariable("FILTER_WEIBO_ADVERTISEMENT", false),
  // AI 相关配置
  AI_ENABLED: getBooleanEnvVariable("AI_ENABLED", false),
  OPENAI_API_KEY: getEnvVariable("OPENAI_API_KEY") || "",
  OPENAI_BASE_URL: getEnvVariable("OPENAI_BASE_URL") || "https://api.openai.com/v1",
  OPENAI_MODEL: getEnvVariable("OPENAI_MODEL") || "gpt-3.5-turbo",
  AI_CACHE_TTL: getNumericEnvVariable("AI_CACHE_TTL", 86400),
  AI_MAX_TOKENS: getNumericEnvVariable("AI_MAX_TOKENS", 500),
  AI_TEMPERATURE: parseFloat(getEnvVariable("AI_TEMPERATURE") || "0.7"),
};
