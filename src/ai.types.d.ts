// AI 功能类型
export type AIFeature = "summary" | "sentiment" | "category";

// 情感类型
export type SentimentType = "positive" | "negative" | "neutral";

// AI 分析请求项
export interface AIAnalyzeItem {
  id: string | number;
  title: string;
  desc?: string;
  url?: string;
}

// AI 分析请求
export interface AIAnalyzeRequest {
  item: AIAnalyzeItem;
  source: string;
  features: AIFeature[];
}

// 批量分析请求
export interface AIBatchAnalyzeRequest {
  items: AIAnalyzeItem[];
  source: string;
  features: AIFeature[];
}

// AI 分析结果
export interface AIAnalysisResult {
  id: string | number;
  summary?: string;
  sentiment?: SentimentType;
  sentimentScore?: number;
  category?: string[];
  keywords?: string[];
  fromCache: boolean;
  updateTime: string;
}

// AI 状态响应
export interface AIStatusResponse {
  enabled: boolean;
  provider: string;
  model: string;
  availableFeatures: AIFeature[];
}

// LLM API 响应格式
export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// LLM 解析结果
export interface LLMParsedResult {
  summary?: string;
  sentiment?: SentimentType;
  sentimentScore?: number;
  category?: string[];
  keywords?: string[];
}
