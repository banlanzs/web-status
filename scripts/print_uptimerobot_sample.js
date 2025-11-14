// prints a sample uptimerobot API debug output
// Run with: node ./scripts/print_uptimerobot_sample.js

console.log("[API Request] 发起新请求 (剩余配额: 9/10)\n");
console.log("========== [server debug] uptimerobot API response ==========");
console.log("Total monitors: 13");
console.log("Total response_times entries: 3551\n");
console.log("Per-monitor summary:");
console.log("  [0] 798724642 (Astro-blog): response_times=274, logs=2");
console.log("  [1] 801285690 (B2图床): response_times=274, logs=0");
console.log("  [2] 799399439 (Comment): response_times=272, logs=2");
console.log("  [3] 801416077 (DO200$-1panel): response_times=273, logs=0");
console.log("  [4] 801780825 (MultiChannel-Broadcast): response_times=274, logs=0");
console.log("  [5] 801267012 (Slow API): response_times=274, logs=3");
console.log("  [6] 798725785 (个人页(cf)): response_times=274, logs=0");
console.log("  [7] 798535764 (博客(cf)): response_times=274, logs=0");
console.log("  [8] 798728151 (博客(备用cn)): response_times=272, logs=36");
console.log("  [9] 798728121 (博客(备用xyz)): response_times=274, logs=2");
console.log("  [10] 801413231 (科技资讯): response_times=272, logs=2");
console.log("  [11] 800304472 (阅后即焚-claw): response_times=271, logs=300");
console.log("  [12] 801285948 (阅后即焚-hf): response_times=273, logs=2\n");
console.log("Sample response_times of monitor[0] (last 10 entries):");
console.log("  datetime=1763021100, value=42ms");
console.log("  datetime=1763020800, value=44ms");
console.log("  datetime=1763020500, value=176ms");
console.log("  datetime=1763020200, value=33ms");
console.log("  datetime=1763019900, value=49ms");
console.log("  datetime=1763019600, value=49ms");
console.log("  datetime=1763019300, value=103ms");
console.log("  datetime=1763019000, value=43ms");
console.log("  datetime=1763018700, value=46ms");
console.log("  datetime=1763018400, value=23ms");
console.log("============================================================\n");
