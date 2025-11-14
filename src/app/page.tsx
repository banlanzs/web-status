"use client";

import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard";
import { ForceRefreshDetector } from "@/components/force-refresh-detector";
import { useMonitors } from "@/components/providers/monitors-provider";

export default function Home() {
  const { monitors, error } = useMonitors();
  const fetchedAt = new Date().toISOString();

  return (
    <>
      <Suspense fallback={null}>
        <ForceRefreshDetector />
      </Suspense>
      <Dashboard
        monitors={monitors}
        fetchedAt={fetchedAt}
        errorMessage={error}
      />
    </>
  );
}