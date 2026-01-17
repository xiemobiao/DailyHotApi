import type { RouterData, ListContext } from "../types.js";
import { get } from "../utils/getData.js";
import { parseRSS } from "../utils/parseRSS.js";

// 支持的分类
const categoryMap: Record<string, string> = {
  world: "国际新闻",
  technology: "科技",
  business: "商业",
  science: "科学",
};

// RSS源地址
const rssUrls: Record<string, string> = {
  world: "https://feeds.bbci.co.uk/news/world/rss.xml",
  technology: "https://feeds.bbci.co.uk/news/technology/rss.xml",
  business: "https://feeds.bbci.co.uk/news/business/rss.xml",
  science: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
};

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const category = c.req.query("type") || "world";
  const listData = await getList(category, noCache);

  const routeData: RouterData = {
    name: "bbc",
    title: "BBC News",
    type: categoryMap[category] || "国际新闻",
    description: "BBC 新闻",
    params: {
      type: {
        name: "新闻分类",
        type: categoryMap,
      },
    },
    link: "https://www.bbc.com/news",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (category: string, noCache: boolean) => {
  const url = rssUrls[category] || rssUrls.world;

  const result = await get({
    url,
    noCache,
    ttl: 1800, // 30分钟缓存
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
        author: item.author || "BBC",
        hot: undefined,
        timestamp: item.pubDate ? new Date(item.pubDate).getTime() : undefined,
        url: item.link || "",
        mobileUrl: item.link || "",
      })),
    };
  } catch (error) {
    throw new Error(`Failed to parse BBC RSS: ${error}`);
  }
};
