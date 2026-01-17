import type { RouterData, ListContext, Options, RouterResType } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";

const typeMap: Record<string, string> = {
  realtime: "热搜",
  novel: "小说",
  movie: "电影",
  teleplay: "电视剧",
  car: "汽车",
  game: "游戏",
};

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const type = c.req.query("type") || "realtime";
  const listData = await getList({ type }, noCache);
  const routeData: RouterData = {
    name: "baidu",
    title: "百度",
    type: typeMap[type],
    params: {
      type: {
        name: "热搜类别",
        type: typeMap,
      },
    },
    link: "https://top.baidu.com/board",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (options: Options, noCache: boolean): Promise<RouterResType> => {
  const { type } = options;
  const url = `https://top.baidu.com/board?tab=${type}`;
  const result = await get({
    url,
    noCache,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/605.1.15",
    },
  });
  const pattern = /<!--s-data:(.*?)-->/s;
  const matchResult = result.data.match(pattern);
  if (!matchResult?.[1]) {
    return { ...result, data: [] };
  }

  const parsed = JSON.parse(matchResult[1]);

  const richList = parsed?.data?.cards?.[0]?.content;
  const liteList = parsed?.cards?.[0]?.content?.[0]?.content;

  const list = Array.isArray(richList) ? richList : Array.isArray(liteList) ? liteList : [];
  if (!list.length) {
    return { ...result, data: [] };
  }

  return {
    ...result,
    data: list.map((v: RouterType["baidu"] | { word?: string; url?: string; index?: number }) => {
      const title = v.word || "";
      const query = "query" in v ? v.query : title;
      const rawUrl = "rawUrl" in v ? v.rawUrl : v.url;
      const cover = "img" in v ? v.img : undefined;
      const desc = "desc" in v ? v.desc : undefined;
      const author = "show" in v && v.show?.length ? v.show : "";
      const hot = "hotScore" in v ? Number(v.hotScore || 0) : undefined;

      return {
        id: typeof v.index === "number" ? v.index : Number.NaN,
        title,
        desc,
        cover,
        author,
        timestamp: 0,
        hot,
        url: query ? `https://www.baidu.com/s?wd=${encodeURIComponent(query)}` : rawUrl || "",
        mobileUrl: rawUrl || "",
      };
    }),
  };
};
