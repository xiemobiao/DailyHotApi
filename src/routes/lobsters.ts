import type { RouterData } from "../types.js";
import { get } from "../utils/getData.js";

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const listData = await getList(noCache);

  const routeData: RouterData = {
    name: "lobsters",
    title: "Lobsters",
    type: "热门",
    description: "Lobsters 技术社区热门文章",
    link: "https://lobste.rs/",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (noCache: boolean) => {
  const url = "https://lobste.rs/hottest.json";

  const result = await get({
    url,
    noCache,
    ttl: 1800, // 30分钟缓存
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  try {
    const stories = Array.isArray(result.data) ? result.data : [];

    return {
      ...result,
      data: stories.slice(0, 30).map((item: any, index: number) => ({
        id: item.short_id || index,
        title: item.title || "",
        desc: item.description || "",
        author: item.submitter_user?.username || "",
        hot: item.score || 0,
        timestamp: item.created_at ? new Date(item.created_at).getTime() : undefined,
        url: item.url || item.comments_url || "",
        mobileUrl: item.url || item.comments_url || "",
      })),
    };
  } catch (error) {
    throw new Error(`Failed to parse Lobsters data: ${error}`);
  }
};
