"use client";

import { useState } from "react";
import { MonitorGroup, MONITOR_GROUPS } from "@/config/monitor-groups";
import type { NormalizedMonitor } from "@/types/uptimerobot";
import { useLanguage } from "@/components/providers/language-provider";

interface GroupManagerProps {
  ungroupedMonitors: NormalizedMonitor[];
  onClose: () => void;
}

export function GroupManager({ ungroupedMonitors, onClose }: GroupManagerProps) {
  const { t } = useLanguage();
  const [assignments, setAssignments] = useState<Record<number, string>>({});

  const handleAssign = (monitorId: number, groupId: string) => {
    setAssignments(prev => ({
      ...prev,
      [monitorId]: groupId
    }));
  };

  const handleSave = () => {
    // 生成新的配置代码
    const newConfig = generateUpdatedConfig(assignments);
    
    // 显示配置代码供用户复制
    navigator.clipboard.writeText(newConfig).then(() => {
      alert('配置代码已复制到剪贴板！请更新 src/config/monitor-groups.ts 文件');
      onClose();
    });
  };

  const generateUpdatedConfig = (assignments: Record<number, string>) => {
    const updatedGroups = MONITOR_GROUPS.map(group => {
      const newMonitors = Object.entries(assignments)
        .filter(([_, groupId]) => groupId === group.id)
        .map(([monitorId]) => parseInt(monitorId));
      
      return {
        ...group,
        monitors: [...group.monitors, ...newMonitors]
      };
    });

    return `export const MONITOR_GROUPS: MonitorGroup[] = ${JSON.stringify(updatedGroups, null, 2)};`;
  };

  if (ungroupedMonitors.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">分配未分组的监控</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {ungroupedMonitors.map(monitor => (
            <div key={monitor.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{monitor.name}</h3>
                <span className="text-sm text-slate-500">ID: {monitor.id}</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {MONITOR_GROUPS.map(group => (
                  <button
                    key={group.id}
                    onClick={() => handleAssign(monitor.id, group.id)}
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      assignments[monitor.id] === group.id
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {group.icon} {group.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            disabled={Object.keys(assignments).length === 0}
          >
            生成配置代码
          </button>
        </div>
      </div>
    </div>
  );
}