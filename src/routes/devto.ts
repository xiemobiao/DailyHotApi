import type { RouterData, ListContext } from "../types.js";
import { get } from "../utils/getData.js";

// 支持的时间范围
const periodMap: Record<string, string> = {
  week: "本周热门",
  month: "本月热门",
  year: "年度热门",
  infinity: "全部时间",
};

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const period = c.req.query("type") || "week";
  const listData = await getList(period, noCache);

  const routeData: RouterData = {
    name: "devto",
    title: "Dev.to",
    type: periodMap[period] || "本周热门",
    description: "Dev.to 开发者社区热门文章",
    params: {
      type: {
        name: "时间范围",
        type: periodMap,
      },
    },
    link: "https://dev.to/",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (period: string, noCache: boolean) => {
  const url = `https://dev.to/api/articles?top=${period === "infinity" ? "365" : period === "year" ? "365" : period === "month" ? "30" : "7"}&per_page=30`;

  const result = await get({
    url,
    noCache,
    ttl: 3600, // 1小时缓存
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  try {
    const articles = Array.isArray(result.data) ? result.data : [];

    return {
      ...result,
      data: articles.slice(0, 30).map((item: any, index: number) => ({
        id: item.id || index,
        title: item.title || "",
        desc: item.description || "",
        cover: item.cover_image || item.social_image || "",
        author: item.user?.name || item.user?.username || "",
        hot: item.public_reactions_count || 0,
        timestamp: item.published_at ? new Date(item.published_at).getTime() : undefined,
        url: item.url || "",
        mobileUrl: item.url || "",
      })),
    };
  } catch (error) {
    throw new Error(`Failed to parse Dev.to data: ${error}`);
  }
};
