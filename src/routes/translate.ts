import { Hono } from "hono";
import { translateService } from "../utils/translate.js";
import logger from "../utils/logger.js";

const translateRouter = new Hono();

// 翻译服务状态检查
translateRouter.get("/status", (c) => {
  const status = translateService.getStatus();
  return c.json({
    code: 200,
    message: "success",
    data: status,
  });
});

// 批量翻译标题
translateRouter.post("/batch", async (c) => {
  try {
    // 检查服务是否可用
    if (!translateService.isAvailable()) {
      return c.json(
        {
          code: 503,
          message: "Translation service is not available. Please check AI configuration.",
        },
        503,
      );
    }

    const body = await c.req.json<{
      texts: string[];
      source: string;
      targetLang?: string;
    }>();

    // 验证请求参数
    if (!body.texts || !Array.isArray(body.texts) || body.texts.length === 0) {
      return c.json(
        {
          code: 400,
          message: "Missing required field: texts (must be a non-empty array)",
        },
        400,
      );
    }

    if (!body.source) {
      return c.json(
        {
          code: 400,
          message: "Missing required field: source",
        },
        400,
      );
    }

    // 限制批量数量
    if (body.texts.length > 20) {
      return c.json(
        {
          code: 400,
          message: "Batch size exceeds limit (max 20 texts per request)",
        },
        400,
      );
    }

    const targetLang = body.targetLang || "zh-CN";

    const results = await translateService.batchTranslate({
      texts: body.texts,
      source: body.source,
      targetLang,
    });

    return c.json({
      code: 200,
      message: "success",
      data: results,
      total: results.length,
    });
  } catch (error) {
    logger.error(
      `[Translate Route] Batch translate error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
    return c.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      500,
    );
  }
});

export default translateRouter;
