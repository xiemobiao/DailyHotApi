import type { RouterData, ListContext } from "../types.js";
import { get } from "../utils/getData.js";
import { parseRSS } from "../utils/parseRSS.js";

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
  // 使用 RSS feed，对 IP 限制更宽松
  const url = `https://www.reddit.com/r/${subreddit}/hot.rss`;

  const result = await get({
    url,
    noCache,
    ttl: 1800,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DailyHot/1.0; +https://github.com/imsyy/DailyHotApi)",
      "Accept": "application/rss+xml, application/xml, text/xml, */*",
    },
  });

  try {
    const items = await parseRSS(result.data);

    return {
      ...result,
      data: items.slice(0, 30).map((item: any, index: number) => ({
        id: item.guid || item.link || index,
        title: item.title || "",
        desc: item.contentSnippet || item.content?.substring(0, 200) || "",
        author: item.author || item.creator || "",
        hot: undefined,
        timestamp: item.pubDate ? new Date(item.pubDate).getTime() : undefined,
        url: item.link || "",
        mobileUrl: item.link || "",
      })),
    };
  } catch (error) {
    throw new Error(`Failed to parse Reddit RSS: ${error}`);
  }
};
