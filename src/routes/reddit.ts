import type { RouterData, ListContext } from "../types.js";
import { get } from "../utils/getData.js";

// 支持的子版块
const subredditMap: Record<string, string> = {
  popular: "热门",
  programming: "编程",
  technology: "科技",
  webdev: "Web开发",
  javascript: "JavaScript",
};

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const sub = c.req.query("type") || "popular";
  const listData = await getList(sub, noCache);

  const routeData: RouterData = {
    name: "reddit",
    title: "Reddit",
    type: subredditMap[sub] || "热门",
    description: "Reddit 热门帖子",
    params: {
      type: {
        name: "版块分类",
        type: subredditMap,
      },
    },
    link: `https://www.reddit.com/r/${sub}/`,
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (subreddit: string, noCache: boolean) => {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=30`;

  const result = await get({
    url,
    noCache,
    ttl: 1800, // 30分钟缓存
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  try {
    const children = result.data?.data?.children || [];

    return {
      ...result,
      data: children.slice(0, 30).map((item: any, index: number) => ({
        id: item.data?.id || index,
        title: item.data?.title || "",
        desc: item.data?.selftext?.substring(0, 200) || "",
        author: item.data?.author || "",
        hot: item.data?.ups || 0,
        timestamp: item.data?.created_utc ? item.data.created_utc * 1000 : undefined,
        url: `https://reddit.com${item.data?.permalink || ""}`,
        mobileUrl: `https://reddit.com${item.data?.permalink || ""}`,
      })),
    };
  } catch (error) {
    throw new Error(`Failed to parse Reddit data: ${error}`);
  }
};
