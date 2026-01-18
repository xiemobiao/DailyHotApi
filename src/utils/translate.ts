import { config } from "../config.js";
import { getCache, setCache } from "./cache.js";
import logger from "./logger.js";

interface TranslateRequest {
  texts: string[];
  source: string;
  targetLang: string;
}

interface TranslateResult {
  original: string;
  translated: string;
  fromCache: boolean;
}

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// 翻译服务类
class TranslateService {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private enabled: boolean;

  constructor() {
    this.baseUrl = config.OPENAI_BASE_URL;
    this.apiKey = config.OPENAI_API_KEY;
    this.model = config.OPENAI_MODEL;
    this.enabled = config.AI_ENABLED;
  }

  // 检查服务是否可用
  isAvailable(): boolean {
    return this.enabled && !!this.apiKey && !!this.baseUrl;
  }

  // 获取服务状态
  getStatus() {
    return {
      enabled: this.enabled,
      available: this.isAvailable(),
    };
  }

  // 生成缓存键
  private getCacheKey(source: string, text: string, targetLang: string): string {
    // 使用文本的哈希作为缓存键的一部分
    const textHash = this.simpleHash(text);
    return `translate:${source}:${targetLang}:${textHash}`;
  }

  // 简单哈希函数
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // 调用 LLM API 进行翻译
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
        max_tokens: 2000,
        temperature: 0.3, // 翻译需要更低的温度以保证准确性
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`[Translate] LLM API error: ${response.status} - ${error}`);
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = (await response.json()) as LLMResponse;
    return data.choices[0].message.content;
  }

  // 系统提示词
  private getSystemPrompt(): string {
    return `你是一个专业的翻译助手。请将用户提供的文本翻译成中文。

要求：
1. 保持原文的语义和语气
2. 翻译要通顺自然，符合中文表达习惯
3. 专有名词、人名、地名等可保留原文或翻译
4. 对于新闻标题，翻译要简洁有力

用户会提供一个 JSON 数组，包含需要翻译的文本列表。
请返回同样格式的 JSON 数组，包含翻译后的文本，顺序保持一致。

示例输入：
["Breaking: AI achieves new milestone", "Scientists discover high-temperature superconductor"]

示例输出：
["突发：AI 达成新里程碑", "科学家发现高温超导体"]

只返回 JSON 数组，不要有其他文字。`;
  }

  // 解析 LLM 响应
  private parseResponse(response: string, originalTexts: string[]): string[] {
    try {
      // 提取 JSON 部分
      let jsonStr = response;
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        const rawMatch = response.match(/\[[\s\S]*\]/);
        if (rawMatch) {
          jsonStr = rawMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) {
        throw new Error("Response is not an array");
      }

      // 确保返回数量与输入一致
      if (parsed.length !== originalTexts.length) {
        logger.warn(
          `[Translate] Response count mismatch: expected ${originalTexts.length}, got ${parsed.length}`,
        );
        // 尝试填补缺失的翻译
        while (parsed.length < originalTexts.length) {
          parsed.push(originalTexts[parsed.length]);
        }
      }

      return parsed;
    } catch (error) {
      logger.error(`[Translate] Parse error: ${error instanceof Error ? error.message : "Unknown"}`);
      // 解析失败时返回原文
      return originalTexts;
    }
  }

  // 批量翻译
  async batchTranslate(request: TranslateRequest): Promise<TranslateResult[]> {
    if (!this.isAvailable()) {
      throw new Error("Translation service is not available");
    }

    const results: TranslateResult[] = [];
    const textsToTranslate: { index: number; text: string }[] = [];

    // 检查缓存
    for (let i = 0; i < request.texts.length; i++) {
      const text = request.texts[i];
      const cacheKey = this.getCacheKey(request.source, text, request.targetLang);
      const cached = await getCache(cacheKey);

      if (cached) {
        logger.info(`[Translate] Cache hit for text ${i}`);
        results[i] = {
          original: text,
          translated: cached.data as string,
          fromCache: true,
        };
      } else {
        textsToTranslate.push({ index: i, text });
      }
    }

    // 如果有需要翻译的文本
    if (textsToTranslate.length > 0) {
      logger.info(`[Translate] Translating ${textsToTranslate.length} texts for ${request.source}`);

      const textsArray = textsToTranslate.map((t) => t.text);
      const prompt = JSON.stringify(textsArray);

      try {
        const response = await this.callLLM(prompt);
        const translations = this.parseResponse(response, textsArray);

        // 填充结果并写入缓存
        for (let i = 0; i < textsToTranslate.length; i++) {
          const { index, text } = textsToTranslate[i];
          const translated = translations[i] || text;

          results[index] = {
            original: text,
            translated,
            fromCache: false,
          };

          // 写入缓存（24小时）
          const cacheKey = this.getCacheKey(request.source, text, request.targetLang);
          await setCache(cacheKey, { data: translated, updateTime: new Date().toISOString() }, 86400);
        }

        logger.info(`[Translate] Translation complete for ${request.source}`);
      } catch (error) {
        logger.error(
          `[Translate] Batch translate error: ${error instanceof Error ? error.message : "Unknown"}`,
        );
        // 翻译失败时返回原文
        for (const { index, text } of textsToTranslate) {
          results[index] = {
            original: text,
            translated: text,
            fromCache: false,
          };
        }
      }
    }

    return results;
  }
}

// 导出单例
export const translateService = new TranslateService();
