import { Dashboard } from "@/components/dashboard";
import { fetchMonitors } from "@/lib/uptimerobot";
import type { NormalizedMonitor } from "@/types/uptimerobot";

export default async function Home() {
  let monitors: NormalizedMonitor[] = [];
  let errorMessage: string | null = null;

  try {
    monitors = await fetchMonitors();
  } catch (error) {
    console.error("加载 UptimeRobot 数据失败", error);
    errorMessage =
      error instanceof Error
        ? error.message
        : null;
  }

  const fetchedAt = new Date().toISOString();

  return (
    <Dashboard
      monitors={monitors}
      fetchedAt={fetchedAt}
      errorMessage={errorMessage}
    />
  );
}