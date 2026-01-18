import { config } from "../config.js";
import { getCache, setCache } from "./cache.js";
import logger from "./logger.js";
import type {
  AIFeature,
  AIAnalyzeRequest,
  AIAnalysisResult,
  AIBatchAnalyzeRequest,
  LLMResponse,
  LLMParsedResult,
} from "../ai.types.js";

// AI 服务类
class AIService {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private enabled: boolean;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.baseUrl = config.OPENAI_BASE_URL;
    this.apiKey = config.OPENAI_API_KEY;
    this.model = config.OPENAI_MODEL;
    this.enabled = config.AI_ENABLED;
    this.maxTokens = config.AI_MAX_TOKENS;
    this.temperature = config.AI_TEMPERATURE;
  }

  // 检查服务是否可用
  isAvailable(): boolean {
    return this.enabled && !!this.apiKey && !!this.baseUrl;
  }

  // 获取服务状态
  getStatus() {
    return {
      enabled: this.enabled,
      provider: this.getProviderName(),
      model: this.model,
      availableFeatures: ["summary", "sentiment", "category"] as AIFeature[],
    };
  }

  // 从 baseUrl 提取提供商名称
  private getProviderName(): string {
    if (this.baseUrl.includes("openai.com")) return "OpenAI";
    if (this.baseUrl.includes("deepseek")) return "DeepSeek";
    if (this.baseUrl.includes("zhipu") || this.baseUrl.includes("bigmodel")) return "智谱AI";
    if (this.baseUrl.includes("dashscope") || this.baseUrl.includes("aliyun")) return "通义千问";
    if (this.baseUrl.includes("moonshot")) return "Moonshot";
    return "Custom";
  }

  // 生成缓存键
  private getCacheKey(source: string, itemId: string | number, features: AIFeature[]): string {
    return `ai:${source}:${itemId}:${features.sort().join(",")}`;
  }

  // 调用 LLM API
  private async callLLM(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: this.getSystemPrompt() },
          { role: "user", content: prompt },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`[AI] LLM API error: ${response.status} - ${error}`);
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = (await response.json()) as LLMResponse;
    return data.choices[0].message.content;
  }

  // 系统提示词
  private getSystemPrompt(): string {
    return `你是一个专业的新闻分析助手。请根据用户提供的热点内容，提供以下分析：
1. 摘要(summary)：用2-3句话概括事件的来龙去脉，简明扼要
2. 情感分析(sentiment)：判断整体舆论倾向，只能是 "positive"(正面)、"negative"(负面) 或 "neutral"(中立) 之一
3. 情感分数(sentimentScore)：给出0到1之间的数值，0表示完全负面，0.5表示中立，1表示完全正面
4. 分类(category)：从以下类别中选择1-2个最相关的标签：科技、娱乐、财经、体育、社会、政治、军事、教育、健康、文化、游戏、其他
5. 关键词(keywords)：提取3-5个核心关键词

请务必以 JSON 格式返回结果，格式如下：
{
  "summary": "摘要内容",
  "sentiment": "positive/negative/neutral",
  "sentimentScore": 0.75,
  "category": ["科技", "社会"],
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

只返回 JSON，不要有其他文字。`;
  }

  // 构建用户提示词
  private buildPrompt(item: AIAnalyzeRequest["item"], features: AIFeature[]): string {
    let prompt = `请分析以下热点内容：\n\n标题：${item.title}`;
    if (item.desc) prompt += `\n描述：${item.desc}`;
    if (item.url) prompt += `\n链接：${item.url}`;
    prompt += `\n\n请只分析并返回以下内容：${features.map((f) => this.featureToText(f)).join("、")}`;
    return prompt;
  }

  // 功能名称映射
  private featureToText(feature: AIFeature): string {
    const map: Record<AIFeature, string> = {
      summary: "摘要(summary)",
      sentiment: "情感分析(sentiment+sentimentScore)",
      category: "分类标签(category+keywords)",
    };
    return map[feature];
  }

  // 解析 LLM 响应
  private parseResponse(response: string): LLMParsedResult {
    try {
      // 提取 JSON 部分（处理可能的 markdown 代码块）
      let jsonStr = response;
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        const rawMatch = response.match(/\{[\s\S]*\}/);
        if (rawMatch) {
          jsonStr = rawMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr);
      return {
        summary: parsed.summary,
        sentiment: parsed.sentiment,
        sentimentScore: parsed.sentimentScore,
        category: parsed.category,
        keywords: parsed.keywords,
      };
    } catch (error) {
      logger.error(`[AI] Parse error: ${error instanceof Error ? error.message : "Unknown"}`);
      throw new Error("Failed to parse AI response");
    }
  }

  // 分析单条内容
  async analyze(request: AIAnalyzeRequest): Promise<AIAnalysisResult> {
    if (!this.isAvailable()) {
      throw new Error("AI service is not available");
    }

    const cacheKey = this.getCacheKey(request.source, request.item.id, request.features);

    // 检查缓存
    const cached = await getCache(cacheKey);
    if (cached) {
      logger.info(`[AI] Cache hit for ${cacheKey}`);
      return {
        ...(cached.data as LLMParsedResult),
        id: request.item.id,
        fromCache: true,
        updateTime: cached.updateTime,
      };
    }

    // 调用 AI
    logger.info(`[AI] Analyzing: ${request.item.title.substring(0, 30)}...`);
    const prompt = this.buildPrompt(request.item, request.features);
    const response = await this.callLLM(prompt);
    const parsed = this.parseResponse(response);

    const result: AIAnalysisResult = {
      id: request.item.id,
      ...parsed,
      fromCache: false,
      updateTime: new Date().toISOString(),
    };

    // 写入缓存
    await setCache(
      cacheKey,
      {
        data: parsed,
        updateTime: result.updateTime,
      },
      config.AI_CACHE_TTL,
    );

    logger.info(`[AI] Analysis complete for ${request.item.id}`);
    return result;
  }

  // 批量分析
  async batchAnalyze(request: AIBatchAnalyzeRequest): Promise<AIAnalysisResult[]> {
    if (!this.isAvailable()) {
      throw new Error("AI service is not available");
    }

    const results: AIAnalysisResult[] = [];

    // 逐个分析（避免并发过多导致 API 限流）
    for (const item of request.items) {
      try {
        const result = await this.analyze({
          item,
          source: request.source,
          features: request.features,
        });
        results.push(result);
      } catch (error) {
        logger.error(
          `[AI] Batch analyze error for ${item.id}: ${error instanceof Error ? error.message : "Unknown"}`,
        );
        // 添加错误结果
        results.push({
          id: item.id,
          fromCache: false,
          updateTime: new Date().toISOString(),
        });
      }
    }

    return results;
  }
}

// 导出单例
export const aiService = new AIService();
