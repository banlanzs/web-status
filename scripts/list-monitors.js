#!/usr/bin/env node

/**
 * 获取所有监控器的 ID 和名称，用于配置分组
 * 使用方法: node scripts/list-monitors.js
 */

const https = require('https');
const { URLSearchParams } = require('url');
const fs = require('fs');
const path = require('path');

// 手动读取 .env.local 文件
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ 错误: 未找到 .env.local 文件');
    console.error('请确保在项目根目录下有 .env.local 文件');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
  
  return envVars;
}

// 加载环境变量
const envVars = loadEnvFile();
const API_KEY = envVars.UPTIMEROBOT_API_KEY;

if (!API_KEY) {
  console.error('❌ 错误: 未找到 UPTIMEROBOT_API_KEY 环境变量');
  console.error('请确保在 .env.local 文件中设置了 UPTIMEROBOT_API_KEY');
  process.exit(1);
}

const params = new URLSearchParams({
  api_key: API_KEY,
  format: 'json',
  logs: '0', // 不需要日志数据
});

const postData = params.toString();

const options = {
  hostname: 'api.uptimerobot.com',
  port: 443,
  path: '/v2/getMonitors',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
  },
};

console.log('🔍 正在获取监控器列表...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.stat !== 'ok') {
        console.error('❌ API 请求失败:', response.error?.message || '未知错误');
        process.exit(1);
      }

      const monitors = response.monitors || [];
      
      if (monitors.length === 0) {
        console.log('📭 没有找到任何监控器');
        return;
      }

      console.log(`📊 找到 ${monitors.length} 个监控器\n`);
      
      // 按状态分组显示
      const statusMap = {
        0: '⏸️  暂停',
        1: '❓ 未知',
        2: '✅ 正常',
        8: '❌ 故障',
        9: '❌ 故障'
      };

      // 准备输出数据
      const outputData = {
        timestamp: new Date().toISOString(),
        total: monitors.length,
        monitors: monitors.map(monitor => ({
          id: monitor.id,
          name: monitor.friendly_name,
          url: monitor.url,
          status: monitor.status,
          statusText: statusMap[monitor.status] || '❓ 未知',
          type: getMonitorType(monitor.type),
          typeCode: monitor.type,
          interval: monitor.interval
        })),
        groupingExample: generateGroupingExample(monitors)
      };

      // 写入 JSON 文件
      const outputPath = path.join(__dirname, '..', 'data.json');
      fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
      
      console.log('✅ 数据已保存到 data.json 文件');
      console.log(`📁 文件路径: ${outputPath}\n`);

      // 在终端显示简要信息
      monitors.forEach((monitor, index) => {
        const status = statusMap[monitor.status] || '❓ 未知';
        console.log(`${index + 1}. ${monitor.friendly_name} (ID: ${monitor.id}) - ${status}`);
      });

      console.log('\n📋 配置建议:');
      console.log('1. 查看 data.json 文件获取详细信息');
      console.log('2. 参考 data.json 中的 groupingExample 配置分组');
      console.log('3. 编辑 src/config/monitor-groups.ts 应用分组配置');
      
    } catch (error) {
      console.error('❌ 解析响应失败:', error.message);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 请求失败:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();

function getMonitorType(type) {
  const types = {
    1: 'HTTP(s)',
    2: 'Keyword',
    3: 'Ping',
    4: 'Port',
    5: 'Heartbeat'
  };
  return types[type] || `Type ${type}`;
}

function generateGroupingExample(monitors) {
  // 智能分组建议
  const groups = {
    blogs: {
      id: "blogs",
      name: "博客站点",
      description: "个人博客和相关服务",
      color: "emerald",
      icon: "📝",
      monitors: []
    },
    tools: {
      id: "tools", 
      name: "工具服务",
      description: "实用工具和应用",
      color: "blue",
      icon: "🔧",
      monitors: []
    },
    monitoring: {
      id: "monitoring",
      name: "监控服务", 
      description: "监控和管理工具",
      color: "purple",
      icon: "📊",
      monitors: []
    },
    navigation: {
      id: "navigation",
      name: "导航站点",
      description: "导航和门户网站", 
      color: "orange",
      icon: "🧭",
      monitors: []
    }
  };

  // 根据名称智能分组
  monitors.forEach(monitor => {
    const name = monitor.friendly_name.toLowerCase();
    
    if (name.includes('博客') || name.includes('blog')) {
      groups.blogs.monitors.push(monitor.id);
    } else if (name.includes('图床') || name.includes('comment') || name.includes('panel') || name.includes('阅后即焚')) {
      groups.tools.monitors.push(monitor.id);
    } else if (name.includes('uptime') || name.includes('监控') || name.includes('broadcast')) {
      groups.monitoring.monitors.push(monitor.id);
    } else if (name.includes('导航') || name.includes('site') || name.includes('nav')) {
      groups.navigation.monitors.push(monitor.id);
    } else {
      // 默认放到工具分组
      groups.tools.monitors.push(monitor.id);
    }
  });

  // 过滤掉空分组
  const result = Object.values(groups).filter(group => group.monitors.length > 0);
  
  return result;
}