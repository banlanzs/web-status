export type Language = "zh" | "en";

const baseTranslations = {
  zh: {
    app: {
      name: "BANLAN站点监测",
      taglineOperational: "站点运行正常",
      taglineIssues: "部分站点存在异常",
      taglineDown: "所有监控均不可用",
      taglineUnknown: "监控状态未知",
      lastUpdated: "更新于 {{time}}",
      nextRefresh: "将于 {{seconds}} 秒后刷新",
      monitorsSummary: "{{total}} 个监控 · {{up}} 正常 · {{down}} 异常",
      empty: "暂无监控数据",
    },
    monitor: {
      typeInterval: "{{type}} / {{interval}} 分钟",
      uptimeLast90: "近 90 天可用率",
      downDurationLast90: "近 90 天宕机时长",
      avgResponse: "平均响应",
      latestResponse: "最新响应",
      incidents: "最近 90 天故障 {{count}} 次 · 累计 {{duration}}",
      incidentsNone: "最近 90 天无故障记录",
      incidentsDetail: "最近 90 天宕机 {{downCount}} 次，暂停 {{pauseCount}} 次 · 累计 {{duration}}",
      status: {
        up: "正常访问",
        down: "异常中",
        paused: "已暂停",
        unknown: "未知状态",
      },
      viewSite: "访问站点",
      linkDisabled: "已隐藏访问链接",
      responseChartTitle: "近期响应时间 (ms)",
      noData: "无数据",
      today: "今天",
      uptimePercent: "可用率 {{percent}}%",
    },
    language: {
      label: "语言",
      zh: "中文",
      en: "English",
    },
    errors: {
      failed: "无法加载监控数据，请稍后重试。",
    },
    controls: {
      refresh: "立即刷新",
      refreshing: "刷新中...",
    },
    auth: {
      loginTitle: "管理员登录",
      loginDescription: "请输入管理密码以访问站点链接。",
      passwordPlaceholder: "输入密码",
      loggingIn: "登录中...",
      loginButton: "登录",
      logout: "退出登录",
      loginPrompt: "请登录后访问",
    },
  },
  en: {
    app: {
      name: "BANLAN Status",
      taglineOperational: "All systems operational",
      taglineIssues: "Partial service disruption",
      taglineDown: "All monitors unavailable",
      taglineUnknown: "Monitor status unknown",
      lastUpdated: "Updated {{time}}",
      nextRefresh: "Refresh in {{seconds}}s",
      monitorsSummary: "{{total}} monitors ({{up}} up, {{down}} down)",
      empty: "No monitors available",
    },
    monitor: {
      typeInterval: "{{type}} / every {{interval}} minutes",
      uptimeLast90: "90-day uptime",
      downDurationLast90: "90-day downtime",
      avgResponse: "Average response",
      latestResponse: "Latest response",
      incidents: "90d: {{count}} incidents, {{duration}} total",
      incidentsNone: "No incidents in past 90 days",
      incidentsDetail: "90d: {{downCount}} down, {{pauseCount}} paused, {{duration}} total",
      status: {
        up: "Operational",
        down: "Disrupted",
        paused: "Paused",
        unknown: "Unknown",
      },
      viewSite: "Visit site",
      linkDisabled: "Link hidden",
      responseChartTitle: "Recent response time (ms)",
      noData: "No data",
      today: "Today",
      uptimePercent: "{{percent}}% uptime",
    },
    language: {
      label: "Language",
      zh: "中文",
      en: "English",
    },
    errors: {
      failed: "Unable to load monitor data. Please try again later.",
    },
    controls: {
      refresh: "Refresh now",
      refreshing: "Refreshing...",
    },
    auth: {
      loginTitle: "Admin Access",
      loginDescription: "Enter password to access site links.",
      passwordPlaceholder: "Password",
      loggingIn: "Logging in...",
      loginButton: "Login",
      logout: "Logout",
      loginPrompt: "Login required",
    },
  },
} satisfies Record<Language, Record<string, unknown>>;

export const translations = baseTranslations;

export const languages: { code: Language; label: string }[] = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
];

type TranslationRecord = (typeof baseTranslations)["zh"];

export type TranslationKey = Paths<TranslationRecord>;

export type TranslationValues = Record<string, string | number>;

type Paths<T, Prefix extends string = ""> = T extends
  | string
  | number
  | boolean
  | null
  | undefined
  ? Prefix
  : {
    [K in Extract<keyof T, string>]: Paths<
      T[K],
      `${Prefix}${Prefix extends "" ? "" : "."}${K}`
    >;
  }[Extract<keyof T, string>];

export function resolveTranslation(path: TranslationKey, lang: Language) {
  const segments = path.split(".");
  let result: unknown = translations[lang];
  for (const segment of segments) {
    if (
      result &&
      typeof result === "object" &&
      segment in (result as Record<string, unknown>)
    ) {
      result = (result as Record<string, unknown>)[segment];
    } else {
      return path;
    }
  }
  return typeof result === "string" ? result : path;
}

export function formatTranslation(
  template: string,
  values?: TranslationValues,
) {
  if (!values) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    if (values[key] === undefined || values[key] === null) return "";
    return String(values[key]);
  });
}

