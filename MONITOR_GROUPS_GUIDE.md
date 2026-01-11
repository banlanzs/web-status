# 监控分组功能使用指南

## 功能概述

新增的分组功能允许你将 UptimeRobot 监控项按照自定义的分组进行组织和显示，提供更好的监控面板体验。

## 快速开始

### 1. 获取监控数据

首先，运行脚本获取所有监控项的详细信息：

```bash
npm run list:monitors
```

这个命令会：
- 从 UptimeRobot API 获取所有监控数据
- 将详细信息保存到 `data.json` 文件中
- 在终端显示简要的监控列表
- 提供智能分组建议

### 2. 查看生成的数据

打开项目根目录下的 `data.json` 文件，你会看到：

```json
{
  "timestamp": "2026-01-11T09:08:41.956Z",
  "total": 12,
  "monitors": [
    {
      "id": 798724642,
      "name": "Astro-blog",
      "url": "https://banlan-astro-blog/",
      "status": 2,
      "statusText": "✅ 正常",
      "type": "HTTP(s)",
      "typeCode": 1,
      "interval": 300
    }
    // ... 更多监控项
  ],
  "groupingExample": [
    {
      "id": "blogs",
      "name": "博客站点",
      "description": "个人博客和相关服务",
      "color": "emerald",
      "icon": "📝",
      "monitors": [798724642, 798535764, 798728151, 798728121]
    }
    // ... 智能分组建议
  ]
}
```

### 3. 应用分组配置

脚本已经根据你的监控项目智能生成了分组建议，并自动更新了 `src/config/monitor-groups.ts` 文件。

当前的分组配置包括：

- **📝 博客站点**: Astro-blog, 博客(cf), 博客(备用cn), 博客(备用xyz)
- **🔧 工具服务**: B2图床, Comment, DO200$-1panel, 阅后即焚等
- **📊 监控服务**: MultiChannel-Broadcast, Uptime-Kuma
- **🧭 导航站点**: 斑斓的导航站

### 4. 启动项目查看效果

```bash
npm run dev
```

在浏览器中访问 `http://localhost:3000`，你会看到：

1. **分组切换按钮**: 在页面头部，可以在分组视图和列表视图之间切换
2. **分组卡片**: 每个分组显示为一个可折叠的卡片，带有颜色主题和图标
3. **分组状态**: 显示分组内监控的整体状态统计
4. **智能布局**: 响应式设计，在移动设备上也能良好显示

## 自定义分组

如果你想调整分组，可以编辑 `src/config/monitor-groups.ts` 文件：

```typescript
export const MONITOR_GROUPS: MonitorGroup[] = [
  {
    id: "custom-group",
    name: "自定义分组",
    description: "你的描述",
    color: "emerald", // emerald, blue, purple, orange, slate
    icon: "🎯", // 任何 emoji
    monitors: [
      123456789, // 你的监控 ID
      987654321, // 另一个监控 ID
    ]
  },
  // 添加更多分组...
];
```

### 支持的颜色主题

- `emerald`: 翠绿色（适合正常状态）
- `blue`: 蓝色（适合服务类）
- `purple`: 紫色（适合监控工具）
- `orange`: 橙色（适合基础设施）
- `slate`: 灰色（适合其他类别）

## 高级功能

### 重新获取数据

当你添加新的监控项或修改监控配置时，重新运行：

```bash
npm run list:monitors
```

这会更新 `data.json` 文件，并提供新的分组建议。

### 分组状态逻辑

- 如果分组内有任何监控处于故障状态，分组状态显示为"故障"
- 如果所有监控都处于暂停状态，分组状态显示为"暂停"  
- 否则分组状态显示为"正常"

### 自动处理未分组监控

系统会自动检测没有分配到任何分组的监控，并将它们显示在"其他服务"部分。

### 数据文件管理

- `data.json` 文件已添加到 `.gitignore`，不会被提交到版本控制
- 每次运行脚本都会更新时间戳和最新数据
- 文件包含完整的监控信息，便于分析和配置

## 部署说明

### 开发环境

```bash
npm run dev
```

### 生产构建

```bash
npm run build
npm start
```

### Vercel 部署

分组功能完全兼容现有的 Vercel 部署流程，无需额外配置。

## 故障排除

### 脚本运行失败

1. 确保 `.env.local` 文件存在且包含有效的 `UPTIMEROBOT_API_KEY`
2. 检查网络连接是否正常
3. 确认 API Key 有足够的权限

### 分组不显示

1. 检查 `src/config/monitor-groups.ts` 中的监控 ID 是否正确
2. 确保监控 ID 是数字类型，不是字符串
3. 查看浏览器控制台是否有错误信息

### 数据文件问题

1. 删除 `data.json` 文件并重新运行 `npm run list:monitors`
2. 检查文件权限是否允许写入
3. 确认项目根目录有写入权限

## 总结

这个增强版的分组功能提供了：

- ✅ **智能数据获取**: 自动获取并保存监控数据到 JSON 文件
- ✅ **智能分组建议**: 基于监控名称自动生成分组建议
- ✅ **便捷配置管理**: 通过配置文件轻松管理分组
- ✅ **完整的数据视图**: JSON 文件包含所有监控详细信息
- ✅ **版本控制友好**: 数据文件自动排除在版本控制之外
- ✅ **用户友好界面**: 直观的分组界面和切换功能

现在你可以轻松管理和组织你的监控项目，获得更好的监控面板体验！