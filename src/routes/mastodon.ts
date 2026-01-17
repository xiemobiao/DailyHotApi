import type { RouterData } from "../types.js";
import { get } from "../utils/getData.js";

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const listData = await getList(noCache);

  const routeData: RouterData = {
    name: "mastodon",
    title: "Mastodon",
    type: "趋势",
    description: "Mastodon 社交网络趋势",
    link: "https://mastodon.social/explore",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (noCache: boolean) => {
  const url = "https://mastodon.social/api/v1/trends/statuses?limit=30";

  const result = await get({
    url,
    noCache,
    ttl: 1800, // 30分钟缓存
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  try {
    const statuses = Array.isArray(result.data) ? result.data : [];

    return {
      ...result,
      data: statuses.slice(0, 30).map((item: any, index: number) => ({
        id: item.id || index,
        title: stripHtml(item.content || "").substring(0, 100) || "无标题",
        desc: stripHtml(item.content || ""),
        author: item.account?.display_name || item.account?.username || "",
        hot: (item.favourites_count || 0) + (item.reblogs_count || 0),
        timestamp: item.created_at ? new Date(item.created_at).getTime() : undefined,
        url: item.url || "",
        mobileUrl: item.url || "",
      })),
    };
  } catch (error) {
    throw new Error(`Failed to parse Mastodon data: ${error}`);
  }
};

// 简单的HTML标签移除
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
};
