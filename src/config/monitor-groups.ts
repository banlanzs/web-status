// 监控分组配置
export interface MonitorGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  monitors: number[]; // UptimeRobot 监控 ID 数组
}

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

// 按分组组织监控数据
export function groupMonitors<T extends { id: number }>(monitors: T[]): {
  groups: Array<{ group: MonitorGroup; monitors: T[] }>;
  ungrouped: T[];
} {
  const result = {
    groups: [] as Array<{ group: MonitorGroup; monitors: T[] }>,
    ungrouped: [] as T[]
  };

  // 为每个分组收集监控
  MONITOR_GROUPS.forEach(group => {
    const groupMonitors = monitors.filter(monitor => 
      group.monitors.includes(monitor.id)
    );
    if (groupMonitors.length > 0) {
      result.groups.push({ group, monitors: groupMonitors });
    }
  });

  // 收集未分组的监控
  const groupedIds = new Set(
    MONITOR_GROUPS.flatMap(group => group.monitors)
  );
  result.ungrouped = monitors.filter(monitor => 
    !groupedIds.has(monitor.id)
  );

  return result;
}