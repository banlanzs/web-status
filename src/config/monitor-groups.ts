// Monitor grouping configuration
// 监控分组配置
export interface MonitorGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  monitors: number[]; // UptimeRobot 监控 ID 数组
}

export const IS_GROUPING_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_GROUPING !== "false" &&
  process.env.NEXT_PUBLIC_ENABLE_GROUPING !== "0";

export const DEFAULT_SHOW_GROUPED =
  process.env.NEXT_PUBLIC_DEFAULT_SHOW_GROUPED !== "false" &&
  process.env.NEXT_PUBLIC_DEFAULT_SHOW_GROUPED !== "0";

// 分组配置 - 基于智能分析的建议配置
export const MONITOR_GROUPS: MonitorGroup[] = [
  {
    id: "blogs",
    name: "博客站点",
    description: "个人博客和相关服务",
    color: "emerald",
    icon: "📝",
    monitors: [
      798724642, // Astro-blog
      798535764, // 博客(cf)
      798728151, // 博客(备用cn)
      798728121, // 博客(备用xyz)
    ]
  },
  {
    id: "tools",
    name: "工具服务",
    description: "实用工具和应用",
    color: "blue",
    icon: "🔧",
    monitors: [
      801285690, // B2图床
      799399439, // Comment
      801416077, // DO200$-1panel
      800304472, // 阅后即焚-claw
      801285948, // 阅后即焚-hf
    ]
  },
  {
    id: "monitoring",
    name: "监控服务",
    description: "监控和管理工具",
    color: "purple",
    icon: "📊",
    monitors: [
      801780825, // MultiChannel-Broadcast
      801974796, // Uptime-Kuma（claw）
    ]
  },
  {
    id: "navigation",
    name: "导航站点",
    description: "导航和门户网站",
    color: "orange",
    icon: "🧭",
    monitors: [
      801800657, // 斑斓的导航站
    ]
  }
];

// 根据监控 ID 查找所属分组
export function getMonitorGroup(monitorId: number): MonitorGroup | null {
  return MONITOR_GROUPS.find(group => 
    group.monitors.includes(monitorId)
  ) || null;
}

// 获取未分组的监控
export function getUngroupedMonitors(allMonitorIds: number[]): number[] {
  const groupedIds = new Set(
    MONITOR_GROUPS.flatMap(group => group.monitors)
  );
  return allMonitorIds.filter(id => !groupedIds.has(id));
}

// 分组规则接口
interface GroupingRule {
  keywords: string[];
  domains: string[];
  patterns: string[];
  tlds?: string[];
  paths?: string[];
}

// 从环境变量读取分组规则
function getGroupingRules(): Record<string, GroupingRule> {
  if (typeof window !== 'undefined') {
    const rules = process.env.NEXT_PUBLIC_AUTO_GROUPING_RULES;
    if (rules) {
      try {
        return JSON.parse(rules);
      } catch (e) {
        console.warn('Failed to parse NEXT_PUBLIC_AUTO_GROUPING_RULES:', e);
      }
    }
  }
  
  // 默认规则作为后备
  return {
    blogs: {
      keywords: ["博客", "blog", "hexo", "astro"],
      domains: ["vercel.app", "github.io", "netlify.app"],
      patterns: ["blog", "diary"],
      tlds: [],
      paths: []
    },
    tools: {
      keywords: ["图床", "comment", "panel", "阅后即焚", "tool"],
      domains: ["herokuapp.com"],
      patterns: ["admin", "manage"],
      tlds: [],
      paths: []
    },
    monitoring: {
      keywords: ["uptime", "监控", "broadcast", "kuma", "monitor"],
      domains: [],
      patterns: ["status", "health", "monitor"],
      tlds: [],
      paths: []
    },
    navigation: {
      keywords: ["导航", "site", "nav", "斑斓"],
      domains: [],
      patterns: ["nav", "portal", "index"],
      tlds: [],
      paths: []
    }
  };
}

// 获取默认分组ID
function getDefaultGroupId(): string | null {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_DEFAULT_GROUP_ID || null;
  }
  return null;
}

interface ParsedUrlParts {
  hostname: string;
  path: string;
  tld: string;
  domain: string;
  subdomain: string;
}

function parseUrlParts(url?: string): ParsedUrlParts | null {
  if (!url) return null;
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(normalized);
    const hostname = urlObj.hostname.toLowerCase();
    const path = (urlObj.pathname || "/").toLowerCase();
    const parts = hostname.split(".").filter(Boolean);
    const tld = parts.length >= 2 ? parts[parts.length - 1] : "";
    const domain = parts.length >= 2 ? parts.slice(-2).join(".") : hostname;
    const subdomain = parts.length > 2 ? parts.slice(0, -2).join(".") : "";
    return { hostname, path, tld, domain, subdomain };
  } catch {
    return null;
  }
}

const SCORE_WEIGHTS = {
  keyword: 10,
  domain: 20,
  tld: 15,
  path: 15,
  pattern: 10
};

const MIN_SCORE = 10;

// 基于监控名称和URL的智能分组规则
export function getAutoGroupForMonitor(monitorName: string, monitorUrl?: string): MonitorGroup | null {
  const name = monitorName.toLowerCase();
  const url = (monitorUrl || '').toLowerCase();
  const urlParts = parseUrlParts(monitorUrl);
  const rules = getGroupingRules();

  let bestGroupId: string | null = null;
  let bestScore = 0;

  // 遍历所有分组规则
  for (const [groupId, rule] of Object.entries(rules)) {
    let score = 0;

    const keywordMatch = rule.keywords?.some(keyword =>
      name.includes(keyword.toLowerCase())
    );
    if (keywordMatch) score += SCORE_WEIGHTS.keyword;

    const domainMatch = urlParts && rule.domains?.some(domain =>
      urlParts.hostname.includes(domain.toLowerCase())
    );
    if (domainMatch) score += SCORE_WEIGHTS.domain;

    const tldMatch = urlParts && rule.tlds?.some(tld =>
      urlParts.tld === tld.toLowerCase()
    );
    if (tldMatch) score += SCORE_WEIGHTS.tld;

    const pathMatch = urlParts && rule.paths?.some(path =>
      urlParts.path.includes(path.toLowerCase())
    );
    if (pathMatch) score += SCORE_WEIGHTS.path;

    const patternMatch = rule.patterns?.some(pattern => {
      const regex = new RegExp(pattern.toLowerCase(), 'i');
      return regex.test(name) || regex.test(url);
    });
    if (patternMatch) score += SCORE_WEIGHTS.pattern;

    if (score > bestScore) {
      bestScore = score;
      bestGroupId = groupId;
    } else if (score === bestScore && score >= MIN_SCORE && bestGroupId) {
      // Tie-breaker: prefer lexicographically smaller id for determinism
      if (groupId < bestGroupId) bestGroupId = groupId;
    }
  }

  if (bestGroupId && bestScore >= MIN_SCORE) {
    return MONITOR_GROUPS.find(g => g.id === bestGroupId) || null;
  }

  // 如果没有匹配到任何规则，尝试使用默认分组
  const defaultGroupId = getDefaultGroupId();
  if (defaultGroupId) {
    return MONITOR_GROUPS.find(g => g.id === defaultGroupId) || null;
  }

  return null;
}

// 按分组组织监控数据（支持自动分组）
export function groupMonitors<T extends { id: number; name: string; url?: string }>(monitors: T[]): {
  groups: Array<{ group: MonitorGroup; monitors: T[] }>;
  ungrouped: T[];
} {
  if (!IS_GROUPING_ENABLED) {
    return { groups: [], ungrouped: monitors };
  }

  const result = {
    groups: [] as Array<{ group: MonitorGroup; monitors: T[] }>,
    ungrouped: [] as T[]
  };

  // 创建分组映射
  const groupMap = new Map<string, T[]>();
  MONITOR_GROUPS.forEach(group => {
    groupMap.set(group.id, []);
  });

  // 分配监控到分组
  monitors.forEach(monitor => {
    let assigned = false;
    
    // 首先检查是否在预配置的分组中
    for (const group of MONITOR_GROUPS) {
      if (group.monitors.includes(monitor.id)) {
        groupMap.get(group.id)?.push(monitor);
        assigned = true;
        break;
      }
    }
    
    // 如果没有预配置，尝试自动分组
    if (!assigned) {
      const autoGroup = getAutoGroupForMonitor(monitor.name, monitor.url);
      if (autoGroup) {
        groupMap.get(autoGroup.id)?.push(monitor);
        assigned = true;
      }
    }
    
    // 如果仍然没有分组，添加到未分组列表
    if (!assigned) {
      result.ungrouped.push(monitor);
    }
  });

  // 构建结果
  MONITOR_GROUPS.forEach(group => {
    const groupMonitors = groupMap.get(group.id) || [];
    if (groupMonitors.length > 0) {
      result.groups.push({ group, monitors: groupMonitors });
    }
  });

  return result;
}