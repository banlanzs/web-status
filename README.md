## 项目简介

基于 Next.js + Tailwind CSS 打造的自定义站点状态面板，使用 UptimeRobot Read-only API 同步监控数据，支持：

- 以卡片形式展示各监控项的状态、响应时间、可用率；
- 近期响应时间曲线（Recharts 实现）；
- 最近 90 天故障统计；
- 语言切换（中文 / English）；
- 自动刷新倒计时，可配置刷新间隔；
- 可选展示监控目标链接（通过环境变量控制）。

## 快速开始

1. 复制环境变量模板并填写：

```bash
cp env.sample .env.local
```

必填项：`UPTIMEROBOT_API_KEY`（在 UptimeRobot 仪表盘获取 Read-only API Key）。

可选项：

- `NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS`：前端自动刷新间隔（秒），默认 300；
- `NEXT_PUBLIC_SHOW_MONITOR_LINKS`：是否展示跳转到监控目标的链接，默认 `true`。

2. 安装依赖：

```bash
npm install
```

3. 启动开发环境：

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 预览。

## 生产部署（Vercel）

1. 在 Vercel 新建项目并选择本仓库；
2. 在 `Project Settings -> Environment Variables` 中配置上述环境变量；
3. 常规部署即可，默认使用 `npm run build`；
4. 如果需要禁用监控链接展示，可将 `NEXT_PUBLIC_SHOW_MONITOR_LINKS` 设置为 `false`。

## 目录结构

- `src/lib/uptimerobot.ts`：封装 API 请求与数据归一化；
- `src/components/*`：UI 组件与语言切换；
- `src/app/page.tsx`：页面入口，加载数据并渲染仪表盘。

## 注意事项

- 当前请求策略为 60 秒刷新一次（Next.js `revalidate`），前端倒计时默认 300 秒；
- 若 UptimeRobot API 调用失败，页面会展示错误提示并保留已有数据；
- 需要更多 UptimeRobot 字段时可在 `fetchMonitors` 中继续扩展。
