import { Hono } from "hono";
import { aiService } from "../utils/ai.js";
import logger from "../utils/logger.js";
import type { AIAnalyzeRequest, AIBatchAnalyzeRequest, AIFeature } from "../ai.types.js";

const aiRouter = new Hono();

// AI 服务状态检查
aiRouter.get("/status", (c) => {
  const status = aiService.getStatus();
  return c.json({
    code: 200,
    message: "success",
    data: status,
  });
});

// 单条内容分析
aiRouter.post("/analyze", async (c) => {
  try {
    // 检查服务是否可用
    if (!aiService.isAvailable()) {
      return c.json(
        {
          code: 503,
          message: "AI service is not available. Please check configuration.",
        },
        503,
      );
    }

    const body = await c.req.json<AIAnalyzeRequest>();

    // 验证请求参数
    if (!body.item || !body.item.id || !body.item.title) {
      return c.json(
        {
          code: 400,
          message: "Missing required fields: item.id and item.title are required",
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

    // 默认所有功能
    const features: AIFeature[] = body.features || ["summary", "sentiment", "category"];

    const result = await aiService.analyze({
      item: body.item,
      source: body.source,
      features,
    });

    return c.json({
      code: 200,
      message: "success",
      data: result,
    });
  } catch (error) {
    logger.error(`[AI Route] Analyze error: ${error instanceof Error ? error.message : "Unknown"}`);
    return c.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      500,
    );
  }
});

// 批量分析
aiRouter.post("/analyze/batch", async (c) => {
  try {
    // 检查服务是否可用
    if (!aiService.isAvailable()) {
      return c.json(
        {
          code: 503,
          message: "AI service is not available. Please check configuration.",
        },
        503,
      );
    }

    const body = await c.req.json<AIBatchAnalyzeRequest>();

    // 验证请求参数
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return c.json(
        {
          code: 400,
          message: "Missing required field: items (must be a non-empty array)",
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
    if (body.items.length > 10) {
      return c.json(
        {
          code: 400,
          message: "Batch size exceeds limit (max 10 items per request)",
        },
        400,
      );
    }

    // 默认所有功能
    const features: AIFeature[] = body.features || ["summary", "sentiment", "category"];

    const results = await aiService.batchAnalyze({
      items: body.items,
      source: body.source,
      features,
    });

    return c.json({
      code: 200,
      message: "success",
      data: results,
      total: results.length,
    });
  } catch (error) {
    logger.error(
      `[AI Route] Batch analyze error: ${error instanceof Error ? error.message : "Unknown"}`,
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

export default aiRouter;
