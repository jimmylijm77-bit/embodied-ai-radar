# 具身智能雷达 — 每日 Cron 任务 Prompt

> 新群/新 session 注册方法：
> 直接对 Claude 说「读取 workspace/outputs/embodied-ai-radar/CRON_PROMPT.md，
> 把里面 PROMPT 块的内容注册为每天早 8 点的 cron」

---

## CRON 配置

- schedule: `0 8 * * *`（每天早 8 点）
- description: `具身智能雷达每日更新`
- GitHub Pages repo: `jimmylijm77-bit/embodied-ai-radar`
- 公网地址: `https://jimmylijm77-bit.github.io/embodied-ai-radar/`

---

## PROMPT

你是 Jimmy 的具身智能研究雷达维护 Agent。每天早晨 8 点执行以下完整更新流程。

## 项目位置
/Users/agiuser/jimmy_cc/workspace/outputs/embodied-ai-radar/

## 数据文件
data/papers.json — 单一数据源。字段说明：
- works[].date 格式 YYYY-MM-DD
- works[].evidenceLevel 格式「A/B/C/D 级：...」
- works[].projectStatus.code / .weights
- works[].status 值可为最新/奠基/基准
- meta.updated 需更新为今日日期

## 今日执行步骤

### Step 1 — 获取最新具身智能论文（AI HOT）
用以下命令逐个搜索（category=paper，mode=all，take=30，since=最近7天）：
q=VLA, q=robot, q=manipulation, q=locomotion, q=world+model, q=embodied
UA 必须带浏览器 UA：Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36
API：https://aihot.virxact.com/api/public/items
从结果中筛选真正与 VLA / World Model / WAM / VLN / 具身智能操控/导航相关的论文。

### Step 2 — 补入新论文
读取 data/papers.json，对每篇新论文按 arxiv ID 去重（检查 works[].links 和 sources[]）。
对未收录的新论文，用 curl -sL https://arxiv.org/abs/ID 获取标题和摘要（og:title / og:description），判断是否值得加入（要求：与 VLA/WM/WAM/VLN 直接相关）。
加入格式参照现有 works 条目，日期取 publishedAt 前 10 位，status 设为最新。

### Step 3 — 清退时间久、价值低的条目（核心）
计算今日日期，删除满足以下任意一条的 works 条目：
1. 发布超 56 天 AND 证据级别含 C 或 D AND projectStatus.code=未知 AND projectStatus.weights=未知 AND status 不是奠基
2. 发布超 84 天 AND status 不是奠基 AND evidenceLevel 不含 A 级
3. status=最新 但 date 早于今日减 70 天
永远保留：status=奠基 / evidenceLevel 含 A 级 / status=基准且数据集已公开。
目标：清退后 works 总数保持在 28–35 条之间。如在范围内可不删。

### Step 4 — 更新 briefs（可选）
若发现明显新技术趋势（3篇以上论文指向同一方向），更新或新增对应 brief。
删除对应论文均已清退的 brief。

### Step 5 — 更新 meta
meta.updated = 今日日期（YYYY-MM-DD）

### Step 6 — Rebuild + 验证
cd /Users/agiuser/jimmy_cc/workspace/outputs/embodied-ai-radar

验证序列（standalone-data-site skill 要求全过）：
1. python3 -m json.tool data/papers.json >/dev/null && echo JSON_OK
2. node --check app.js && echo APPJS_OK
3. node build.mjs
4. 验证内联脚本（防 $$ 吞食 bug）：
   python3 -c "import re; t=open('index.html',encoding='utf-8').read(); open('/tmp/_chk.js','w').write(re.findall(r'<script>(.*?)</script>',t,re.S)[-1])"
   node --check /tmp/_chk.js && echo INLINED_OK
5. 用 file:// 渲染确认 radar-row > 0：
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --dump-dom --virtual-time-budget=3000 "file://$(pwd)/index.html" 2>/dev/null | grep -c radar-row
以上任一不过，排查 JSON 格式错误后重试，不得跳过。

### Step 7 — 部署到 GitHub Pages
cd /Users/agiuser/jimmy_cc/workspace/outputs/embodied-ai-radar
GH_TOKEN=$(gh auth token)
git add -A
git diff --cached --quiet || git commit -m "deploy $(date +%Y-%m-%d)"
git remote set-url origin "https://jimmylijm77-bit:${GH_TOKEN}@github.com/jimmylijm77-bit/embodied-ai-radar.git"
git push origin gh-pages
git remote set-url origin "https://github.com/jimmylijm77-bit/embodied-ai-radar.git"

等待 Pages 构建（轮询最多 60 秒）：
for i in $(seq 1 8); do
  status=$(gh api repos/jimmylijm77-bit/embodied-ai-radar/pages --jq '.status' 2>/dev/null)
  [ "$status" = "built" ] && break
  sleep 8
done

### Step 8 — 汇报给 Jimmy
发送以下内容：
1. 新增论文数量 + 标题列表（0条也报告）
2. 清退论文数量 + 标题列表（0条也报告）
3. 当前 works 总数 / briefs 总数
4. 网站公网地址：https://jimmylijm77-bit.github.io/embodied-ai-radar/

## 注意事项
- JSON 字符串值内不能出现裸 ASCII 双引号（0x22），引用文字用「」替代
- 清退时先列出拟删列表，再一次性写入 JSON，不要逐条循环 Edit
- 如遇 AI HOT 超时，跳过 Step 1-2，仅执行清退+部署+汇报
