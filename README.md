# 具身智能研究雷达 · Embodied AI Radar

单文件、双击即开、零依赖的数据驱动研究雷达。聚焦最新 VLA / 世界模型 / WAM / VLN 工作。

## 直接查看

双击 `index.html`，或：

```bash
open index.html
```

`index.html` 是构建产物，已内联全部数据/样式/脚本，**不依赖网络、服务器或同目录其他文件**。

## 修改内容后重建

内容只改 `data/papers.json`（单一数据源），样式改 `styles.css`，交互改 `app.js`，结构改 `index.src.html`，然后：

```bash
node build.mjs
```

即可把四者内联生成新的 `index.html`。

## 关键约束（务必遵守，否则页面会变空壳）

1. **不要用 `fetch()` 读本地 JSON**——`file://` 下被浏览器拦截。数据通过 `window.__DATA__` 内联注入。
2. **`build.mjs` 用函数替换器**（`html.replace(x, () => y)`）——否则 `app.js` 里的 `$$` 会被 `String.replace` 当成替换模式吞掉，导致整页不渲染。
3. **`app.js` 用 IIFE 包裹**，内联后不污染全局。

## 自验（用真实 file://，不是 http server）

```bash
python3 -m json.tool data/papers.json >/dev/null   # JSON 校验
node --check app.js                                 # JS 校验
node build.mjs                                      # 构建
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --dump-dom --virtual-time-budget=3000 \
  "file://$(pwd)/index.html" | grep -c 'class="radar-row"'   # 应 > 0
```

## 复用

本项目的可复用方法已沉淀为 skill：`.claude/skills/standalone-data-site`。
UI 规范来自 skill：`frontend-design-pro`、`ui-ux-pro-max`。
