import type { RouterData } from "../types.js";
import { get } from "../utils/getData.js";
import { parseRSS } from "../utils/parseRSS.js";

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const listData = await getList(noCache);
  const routeData: RouterData = {
    name: "producthunt",
    title: "Product Hunt",
    type: "Today",
    description: "The best new products, every day",
    link: "https://www.producthunt.com/",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (noCache: boolean) => {
  // 使用 RSS feed 获取数据
  const url = "https://www.producthunt.com/feed";

  const result = await get({
    url,
    noCache,
    ttl: 1800, // 30分钟缓存
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/rss+xml, application/xml, text/xml, */*",
    },
  });

  try {
    const items = await parseRSS(result.data);

    return {
      ...result,
      data: items.slice(0, 30).map((item: any, index: number) => ({
        id: item.guid || index,
        title: item.title || "",
        desc: item.contentSnippet || item.content || "",
        author: item.author || "",
        hot: undefined,
        timestamp: item.pubDate ? new Date(item.pubDate).getTime() : undefined,
        url: item.link || "",
        mobileUrl: item.link || "",
      })),
    };
  } catch (error) {
    throw new Error(`Failed to parse Product Hunt RSS: ${error}`);
  }
};
