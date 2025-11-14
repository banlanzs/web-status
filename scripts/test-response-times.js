/**
 * 测试脚本：检查 UptimeRobot API 响应时间数据
 * 
 * 使用方法：
 * node scripts/test-response-times.js
 */

require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.UPTIMEROBOT_API_KEY;
const API_ENDPOINT = 'https://api.uptimerobot.com/v2/getMonitors';

if (!API_KEY) {
  console.error('错误: 未找到 UPTIMEROBOT_API_KEY 环境变量');
  console.error('请在 .env.local 文件中设置：UPTIMEROBOT_API_KEY=your_api_key');
  process.exit(1);
}

// 生成自定义时间范围
function generateCustomUptimeRanges() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = [7, 30, 90];
  
  return days.map((day) => {
    const start = Math.floor((today.getTime() - day * 24 * 60 * 60 * 1000) / 1000);
    const end = Math.floor(today.getTime() / 1000);
    return `${start}_${end}`;
  }).join('-');
}

async function testAPI() {
  const now = Math.floor(Date.now() / 1000);
  const logsStartDate = now - 90 * 24 * 60 * 60; // 90天前
  
  const params = new URLSearchParams({
    api_key: API_KEY,
    format: 'json',
    logs: '1',
    logs_limit: '300',
    log_types: '1-2-99',
    logs_start_date: String(logsStartDate),
    logs_end_date: String(now),
    response_times: '1',
    response_times_limit: '2000',
    custom_uptime_ranges: generateCustomUptimeRanges(),
    custom_uptime_ratios: '7-30-90',
  });

  console.log('正在请求 UptimeRobot API...\n');
  console.log('请求参数:');
  console.log('- response_times: 1');
  console.log('- response_times_limit: 2000');
  console.log('- logs_limit: 300\n');

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.stat !== 'ok') {
      throw new Error(`API 错误: ${data.error?.message || '未知错误'}`);
    }

    console.log('========== API 响应摘要 ==========\n');
    console.log(`监控器总数: ${data.monitors?.length || 0}\n`);

    const monitors = data.monitors || [];
    const totalResponseTimes = monitors.reduce((acc, m) => acc + (m.response_times?.length || 0), 0);
    console.log(`响应时间数据总条数: ${totalResponseTimes}\n`);

    if (monitors.length === 0) {
      console.log('⚠️  未找到任何监控器');
      return;
    }

    console.log('========== 各监控器详情 ==========\n');
    monitors.forEach((monitor, idx) => {
      const rtCount = monitor.response_times?.length || 0;
      const avgRT = monitor.average_response_time || 'N/A';
      const logsCount = monitor.logs?.length || 0;

      console.log(`[${idx + 1}] ${monitor.friendly_name} (ID: ${monitor.id})`);
      console.log(`    状态: ${getStatusLabel(monitor.status)}`);
      console.log(`    类型: ${getMonitorTypeLabel(monitor.type)}`);
      console.log(`    URL: ${monitor.url}`);
      console.log(`    监控间隔: ${monitor.interval / 60} 分钟`);
      console.log(`    响应时间数据: ${rtCount} 条`);
      console.log(`    平均响应时间: ${avgRT} ms`);
      console.log(`    事件日志: ${logsCount} 条`);

      if (rtCount > 0) {
        const firstRT = monitor.response_times[0];
        const lastRT = monitor.response_times[rtCount - 1];
        console.log(`    时间范围: ${formatTimestamp(firstRT.datetime)} ~ ${formatTimestamp(lastRT.datetime)}`);
        
        // 显示最近 5 条数据
        console.log(`    最近 5 条响应时间:`);
        monitor.response_times.slice(-5).forEach(rt => {
          console.log(`      - ${formatTimestamp(rt.datetime)}: ${rt.value} ms`);
        });
      } else if (avgRT !== 'N/A') {
        console.log(`    ⚠️  没有响应时间数据点，但有平均值（将使用降级方案）`);
      } else {
        console.log(`    ⚠️  完全没有响应时间数据`);
      }

      console.log('');
    });

    console.log('========== 结论 ==========\n');
    if (totalResponseTimes > 0) {
      console.log('✅ API 返回了响应时间数据，图表应该正常显示');
    } else {
      const hasAvgRT = monitors.some(m => m.average_response_time);
      if (hasAvgRT) {
        console.log('⚠️  API 没有返回响应时间数据点，但有平均值');
        console.log('   将使用降级方案生成占位数据');
      } else {
        console.log('❌ API 没有返回任何响应时间数据');
        console.log('   可能的原因:');
        console.log('   - 监控器刚创建，还没有足够的历史数据');
        console.log('   - UptimeRobot 账户限制');
        console.log('   - 监控类型不支持响应时间');
      }
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    if (error.message.includes('API')) {
      console.error('\n请检查:');
      console.error('1. API Key 是否正确');
      console.error('2. 网络连接是否正常');
      console.error('3. UptimeRobot 服务是否可用');
    }
  }
}

function getStatusLabel(status) {
  const statusMap = {
    0: '暂停 (Paused)',
    1: '未检测 (Not checked yet)',
    2: '正常 (Up)',
    8: '宕机 (Down)',
    9: '宕机 (Down)',
  };
  return statusMap[status] || `未知 (${status})`;
}

function getMonitorTypeLabel(type) {
  const typeMap = {
    1: 'HTTP(s)',
    2: 'Keyword',
    3: 'Ping',
    4: 'Port',
    5: 'Heartbeat',
  };
  return typeMap[type] || `Type ${type}`;
}

function formatTimestamp(datetime) {
  const ts = typeof datetime === 'number' ? datetime : parseInt(datetime);
  const date = ts < 1e12 ? new Date(ts * 1000) : new Date(ts);
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

// 运行测试
testAPI();
