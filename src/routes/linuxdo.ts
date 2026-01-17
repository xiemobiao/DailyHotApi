import type { RouterData, ListContext } from "../types.js";
import { get } from "../utils/getData.js";
import { getTime } from "../utils/getTime.js";
import { parseRSS } from "../utils/parseRSS.js";

type PeriodType = "daily" | "weekly" | "monthly";

const periodMap: Record<PeriodType, string> = {
  daily: "日榜",
  weekly: "周榜",
  monthly: "月榜",
};

const defaultPeriod: PeriodType = "weekly";

const normalizePeriod = (period?: string): PeriodType =>
  period && period in periodMap ? (period as PeriodType) : defaultPeriod;

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const period = normalizePeriod(c.req.query("period"));
  const listData = await getList(period, noCache);
  const routeData: RouterData = {
    name: "linuxdo",
    title: "Linux.do",
    type: periodMap[period],
    description: "Linux 技术社区热搜",
    params: {
      period: {
        name: "榜单周期",
        type: periodMap,
      },
    },
    link: `https://linux.do/top/${period}`,
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (period: PeriodType, noCache: boolean) => {
  const url = `https://linux.do/top.rss?period=${period}`;
  const result = await get({
    url,
    noCache,
    headers: {
      "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    },
  });

  const items = await parseRSS(result.data);
  const list = items.map((item, index) => {
    const link = item.link || "";
    return {
      id: item.guid || link || index,
      title: item.title || "",
      desc: item.contentSnippet?.trim() || item.content?.trim() || "",
      author: item.author,
      timestamp: getTime(item.pubDate || 0),
      url: link,
      mobileUrl: link,
      hot: undefined,
    };
  });

  return {
    ...result,
    data: list,
  };
};
