import { Dashboard } from "@/components/dashboard";
import { fetchMonitors } from "@/lib/uptimerobot";
import type { NormalizedMonitor } from "@/types/uptimerobot";
import { ForceRefreshDetector } from "@/components/force-refresh-detector";

interface HomeProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// 添加一个函数来检测是否需要强制刷新
async function shouldForceRefresh(searchParams?: Promise<{ [key: string]: string | string[] | undefined }>) {
  // 检查是否有强制刷新的标记（例如通过查询参数）
  if (!searchParams) return false;
  const params = await searchParams;
  return !!params?.force;
}

export default async function Home({ searchParams }: HomeProps) {
  let monitors: NormalizedMonitor[] = [];
  let errorMessage: string | null = null;
  let forceUpdate = false;

  try {
    // 检查是否需要强制刷新
    forceUpdate = await shouldForceRefresh(searchParams);
    monitors = await fetchMonitors(forceUpdate);
  } catch (error) {
    console.error("加载 UptimeRobot 数据失败", error);
    errorMessage =
      error instanceof Error
        ? error.message
        : null;
  }

  const fetchedAt = new Date().toISOString();

  return (
    <>
      <ForceRefreshDetector />
      <Dashboard
        monitors={monitors}
        fetchedAt={fetchedAt}
        errorMessage={errorMessage}
      />
    </>
  );
}