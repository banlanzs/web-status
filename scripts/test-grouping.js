#!/usr/bin/env node

/**
 * 测试分组规则的脚本
 * 使用方法: node scripts/test-grouping.js
 */

// 模拟环境变量
process.env.NEXT_PUBLIC_AUTO_GROUPING_RULES = JSON.stringify({
  "blogs": {
    "keywords": ["博客", "blog", "hexo", "astro", "wordpress", "gatsby", "nuxt", "hugo"],
    "domains": ["vercel.app", "github.io", "netlify.app", "pages.dev"],
    "patterns": ["blog", "diary", "journal"]
  },
  "tools": {
    "keywords": ["图床", "comment", "panel", "阅后即焚", "1panel", "b2", "api", "service", "tool", "upload", "share"],
    "domains": ["herokuapp.com", "railway.app", "render.com"],
    "patterns": ["admin", "manage", "dashboard", "console"]
  },
  "monitoring": {
    "keywords": ["uptime", "监控", "broadcast", "kuma", "multichannel", "status", "health", "ping", "monitor"],
    "domains": ["uptimerobot.com", "pingdom.com"],
    "patterns": ["status", "health", "monitor", "check"]
  },
  "navigation": {
    "keywords": ["导航", "site", "nav", "斑斓", "portal", "index", "home", "main"],
    "domains": [],
    "patterns": ["nav", "portal", "index", "directory"]
  }
});

process.env.NEXT_PUBLIC_DEFAULT_GROUP_ID = "tools";

// 测试用例
const testCases = [
  { name: "hexo-blog (ae.kg)", url: "https://blog.ae.kg", expected: "blogs" },
  { name: "My Personal Blog", url: "https://myblog.vercel.app", expected: "blogs" },
  { name: "WordPress Site", url: "https://mysite.com", expected: "blogs" },
  { name: "图床服务", url: "https://images.example.com", expected: "tools" },
  { name: "Admin Panel", url: "https://admin.example.com", expected: "tools" },
  { name: "API Service", url: "https://api.herokuapp.com", expected: "tools" },
  { name: "Uptime Monitor", url: "https://status.example.com", expected: "monitoring" },
  { name: "Health Check", url: "https://health.example.com", expected: "monitoring" },
  { name: "导航站点", url: "https://nav.example.com", expected: "navigation" },
  { name: "Portal Site", url: "https://portal.example.com", expected: "navigation" },
  { name: "Random Service", url: "https://random.example.com", expected: "tools" }, // 默认分组
];

// 模拟分组函数
function getAutoGroupForMonitor(monitorName, monitorUrl) {
  const name = monitorName.toLowerCase();
  const url = (monitorUrl || '').toLowerCase();
  const rules = JSON.parse(process.env.NEXT_PUBLIC_AUTO_GROUPING_RULES);
  
  // 遍历所有分组规则
  for (const [groupId, rule] of Object.entries(rules)) {
    // 检查关键词匹配
    const keywordMatch = rule.keywords.some(keyword => 
      name.includes(keyword.toLowerCase())
    );
    
    // 检查域名匹配
    const domainMatch = rule.domains.some(domain => 
      url.includes(domain.toLowerCase())
    );
    
    // 检查模式匹配（更灵活的匹配）
    const patternMatch = rule.patterns.some(pattern => {
      const regex = new RegExp(pattern.toLowerCase(), 'i');
      return regex.test(name) || regex.test(url);
    });
    
    // 如果任何一种匹配成功，返回对应分组
    if (keywordMatch || domainMatch || patternMatch) {
      return groupId;
    }
  }
  
  // 如果没有匹配到任何规则，尝试使用默认分组
  return process.env.NEXT_PUBLIC_DEFAULT_GROUP_ID || null;
}

console.log('🧪 测试分组规则...\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = getAutoGroupForMonitor(testCase.name, testCase.url);
  const success = result === testCase.expected;
  
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   URL: ${testCase.url}`);
  console.log(`   预期: ${testCase.expected}`);
  console.log(`   结果: ${result}`);
  console.log(`   状态: ${success ? '✅ 通过' : '❌ 失败'}`);
  console.log('');
  
  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);

if (failed === 0) {
  console.log('🎉 所有测试通过！分组规则工作正常。');
} else {
  console.log('⚠️  有测试失败，请检查分组规则配置。');
  process.exit(1);
}