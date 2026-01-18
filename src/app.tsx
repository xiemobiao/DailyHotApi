import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { compress } from "hono/compress";
import { prettyJSON } from "hono/pretty-json";
import { trimTrailingSlash } from "hono/trailing-slash";
import logger from "./utils/logger.js";
import registry from "./registry.js";
import aiRouter from "./routes/ai.js";
import userRouter from "./routes/user.js";
import translateRouter from "./routes/translate.js";
import { getDb } from "./db/index.js";
import robotstxt from "./robots.txt.js";
import NotFound from "./views/NotFound.js";
import Home from "./views/Home.js";
import Error from "./views/Error.js";

// 初始化数据库
getDb();

const app = new Hono();

// 压缩响应
app.use(compress());

// prettyJSON
app.use(prettyJSON());

// 尾部斜杠重定向
app.use(trimTrailingSlash());

// CORS
app.use(
  "*",
  cors({
    // 可写为数组
    origin: (origin) => {
      // 是否指定域名
      const isSame = config.ALLOWED_HOST && origin.endsWith(config.ALLOWED_HOST);
      return isSame ? origin : config.ALLOWED_DOMAIN;
    },
    allowMethods: ["POST", "GET", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["X-Custom-Header", "Upgrade-Insecure-Requests", "Authorization", "Content-Type"],
    credentials: true,
  }),
);

// 静态资源
app.use(
  "/*",
  serveStatic({
    root: "./public",
    rewriteRequestPath: (path) => (path === "/favicon.ico" ? "/favicon.png" : path),
  }),
);

// AI 路由
app.route("/ai", aiRouter);

// 翻译路由
app.route("/translate", translateRouter);

// 用户路由
app.route("/user", userRouter);

// 主路由
app.route("/", registry);

// robots
app.get("/robots.txt", robotstxt);
// 首页
app.get("/", (c) => c.html(<Home />));
// 404
app.notFound((c) => c.html(<NotFound />, 404));
// error
app.onError((err, c) => {
  logger.error(`❌ [ERROR] ${err?.message}`);
  return c.html(<Error error={err?.message} />, 500);
});

export default app;
