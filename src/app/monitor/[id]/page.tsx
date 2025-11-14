"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MonitorDetail } from "@/components/monitor-detail";
import { useMonitors } from "@/components/providers/monitors-provider";
import { SkeletonCard } from "@/components/loading";
import type { NormalizedMonitor } from "@/types/uptimerobot";

export default function MonitorPage() {
  const params = useParams();
  const id = params?.id as string;
  const { monitors, isLoading } = useMonitors();
  const [monitor, setMonitor] = useState<NormalizedMonitor | null>(null);

  useEffect(() => {
    if (monitors.length > 0) {
      const found = monitors.find((m) => String(m.id) === id);
      setMonitor(found || null);
    }
  }, [monitors, id]);

  if (isLoading || !monitor) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!monitor && monitors.length > 0) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-2xl font-bold text-slate-900">监控器未找到</h1>
          <p className="mt-2 text-slate-600">ID: {id}</p>
        </div>
      </div>
    );
  }

  return <MonitorDetail monitor={monitor} />;
}