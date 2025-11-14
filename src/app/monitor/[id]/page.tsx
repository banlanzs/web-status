import { notFound } from "next/navigation";

import { MonitorDetail } from "@/components/monitor-detail";
import { fetchMonitors } from "@/lib/uptimerobot";
import type { NormalizedMonitor } from "@/types/uptimerobot";

interface MonitorPageProps {
  params: Promise<{ id: string }>;
}

export default async function MonitorPage({ params }: MonitorPageProps) {
  const { id } = await params;
  const monitors: NormalizedMonitor[] = await fetchMonitors();
  const monitor = monitors.find((m) => String(m.id) === id);

  if (!monitor) {
    notFound();
  }

  return <MonitorDetail monitor={monitor} />;
}
