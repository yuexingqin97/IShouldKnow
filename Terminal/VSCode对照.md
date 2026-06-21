# VSCode → Neovim 迁移对照

> 给日常用 VSCode 的自己：不是「Neovim 能不能替代 VSCode」，而是「VSCode 里我熟悉的动作，在 Neovim 里怎么找」。把你已有的肌肉记忆翻译过去，比从零学快十倍。

---

## 0. 一个关键认知，先看懂这个

VSCode 的代码智能（补全、跳转定义、错误诊断）**不是 VSCode 自己实现的**——它背后跑着一个独立的程序，叫 **LSP（Language Server Protocol）服务器**。

```
VSCode 的智能 ──靠的是──> rust-analyzer（独立进程）
                          typescript-language-server（独立进程）
                          clangd（独立进程）
```

而 LSP 是一个**开放协议**——任何编辑器都可以和这些服务器对话。

```
Neovim 的智能 ──也靠──> 同一个 rust-analyzer（同一个进程！）
                       同一个 typescript-language-server
```

**所以核心结论：** Neovim 和 VSCode 在「代码补全 / 跳转 / 诊断」上的质量基本一致——因为用的是同一个 LSP 服务器。两者真正的差距在**外壳**：文件树、调试器 UI、集成度、开箱即用程度。

> 理解这一点，你就不会被「Neovim 写 Rust 会不会不如 VSCode 智能」这种问题困扰。智能来自同一个地方。

---

## 1. 通用操作对照表（背肌肉记忆）

### 文件 / 导航

| 你想干 | VSCode | Neovim（kickstart） |
|--------|--------|---------------------|
| 快速打开文件 | `Cmd + P` | `Space` `s` `f`（telescope find files） |
| 全局搜文本 | `Cmd + Shift + F` | `Space` `s` `g`（telescope live grep） |
| 命令面板 | `Cmd + Shift + P` | `:` 进入命令模式 |
| 开关侧边栏 | `Cmd + B` | `\`（neo-tree） |
| 切换标签页 | `Ctrl + Tab` | `gt` / `gT`（下/上一个 tab） |
| 关闭标签 | `Cmd + W` | `:bd`（buffer delete）或 `:q` |

### 代码编辑

| 你想干 | VSCode | Neovim |
|--------|--------|--------|
| 注释行 | `Cmd + /` | `gcc`（单行）/ `gc`（选区） |
| 选中下一个相同词 | `Cmd + D` | 需装 multicursors.nvim，然后映射 |
| 全选相同词 | `Cmd + Shift + L` | 同上插件 |
| 重命名符号 | `F2` | `Space + r n`（LSP rename） |
| 格式化文档 | `Shift + Alt + F` | `Space + f`（conform.nvim，需配 formatter） |
| 移动整行 | `Alt + ↑/↓` | `:m+1`（下移）/ `:m-2`（上移），或插件 |
| 复制整行 | `Shift + Alt + ↓` | `yyp`（复制粘贴到下一行） |
| 多光标 | `Alt + 点击` | multicursors.nvim，体验不如 VSCode 顺 |

### 复制 / 剪切 / 粘贴 + 剪贴板（vim 的经典坑）

vim 的复制粘贴走「寄存器」模型：先选中，再操作。

| 你想干 | VSCode | Neovim | 说明 |
|--------|--------|--------|------|
| 选中 | 鼠标拖 | `v`（字符选）/ `V`（整行选）/ `Ctrl + V`（块选） | vim 的「选中」叫 visual 模式 |
| 复制选中 | `Cmd + C` | `y` | yank |
| 复制整行 | `Cmd + C` | `yy` | |
| 剪切选中 | `Cmd + X` | `d` | delete = 剪切（内容进寄存器） |
| 剪切整行 | `Cmd + X` | `dd` | |
| 粘贴 | `Cmd + V` | `p`（光标后）/ `P`（光标前） | |
| 从系统剪贴板粘贴 | `Cmd + V` | `"+p` | 或开 `clipboard=unnamedplus` 后直接 `p` |

> ⚠️ **经典坑**：vim 的 `y`/`d` 默认进 **vim 内部寄存器**，不是系统剪贴板。所以 `yy` 复制的内容，在 VSCode/浏览器里 `Cmd + V` 贴不出来。两个解法：
>
> 1. 显式操作：`"+y` 复制到系统剪贴板，`"+p` 粘贴
> 2. **（推荐）**配置 `set clipboard=unnamedplus`，让所有 `y`/`d`/`p` 都走系统剪贴板——kickstart 默认开了这个，行为就和普通编辑器一致，`yy` 复制的内容外面也能贴

> 记忆：`y` = yank（拽过来=复制）、`d` = delete（删=剪切，因为内容留着）、`p` = put（放=粘贴）。vim 没有"剪切"这个词，删除即剪切。

#### 进阶：不污染剪贴板 + 寄存器历史

vim 的寄存器系统比普通剪贴板强——它能「干净删除」也能「翻历史」。

**1. 删除但不污染寄存器——黑洞寄存器 `"_`**

`dd` 会把内容塞进寄存器，覆盖你之前 yank 的东西。用 `"_` 开头，内容直接进「黑洞」（vim 版 `/dev/null`），不进任何寄存器：

| 操作 | 效果 |
|------|------|
| `dd` | 删除，内容进寄存器（**会**覆盖之前 yank 的） |
| `"_dd` | 删除，内容进黑洞（**不**污染） |

> 实战：你 `yy` 复制了一行要粘贴，中间要先删几行垃圾——用 `"_dd` 删垃圾，yank 的内容不受影响。

**2. vim 自带的「剪贴板历史」——编号寄存器**

vim 没有历史面板，但用编号寄存器记了历史：

| 寄存器 | 装什么 |
|--------|--------|
| `"`（无名） | 最近一次删除或复制 |
| `"0` | 最近一次 **yank**（复制）——即使之后删了一堆，这里还留着原始复制 |
| `"1` ~ `"9` | 最近 9 次 **删除**（`"1` 最新，`"9` 最老） |

- `:reg`（或 `:registers`）—— 列出所有寄存器内容
- `"0p` —— 粘贴最初的 yank（哪怕中间删了一堆）
- `"3p` —— 粘贴第 3 次删除的内容

**3. 真正的跨应用剪贴板历史——用 Mac 工具**

vim 寄存器只在 vim 内部。要翻「半小时前网页复制的、刚才 VSCode 复制的」，得用系统剪贴板管理器：

| 工具 | 特点 |
|------|------|
| **Raycast**（🔥推荐） | 启动器 + 剪贴板历史 + 窗口管理一体，Spotlight 超级版 |
| Maccy | 轻量纯剪贴板历史，开源免费 |
| Flycut | 经典菜单栏剪贴板历史 |

### 代码导航（LSP，两者质量一致）

| 你想干 | VSCode | Neovim |
|--------|--------|--------|
| 跳转定义 | `F12` | `g d` |
| 查找引用 | `Shift + F12` | `g r` |
| 悬停看文档 | 鼠标悬停 | `K`（大写 K） |
| 代码操作（灯泡💡） | `Cmd + .` | `Space + c a`（code action） |
| 符号列表（文件内） | `Cmd + Shift + O` | `Space + s` |
| 回到上一个位置 | `Alt + ←` | `Ctrl + o` |

### 分屏 / 窗口

| 你想干 | VSCode | Neovim |
|--------|--------|--------|
| 垂直分屏 | `Cmd + \` | `:vsplit` |
| 水平分屏 | `Cmd + \` 然后选方向 | `:split` |
| 切换分屏 | `Cmd + 数字` / 点击 | `Ctrl + W + h/j/k/l` |
| 关闭分屏 | `Cmd + W` | `Ctrl + W + q` |

### 搜索与跳转——vim 的导航系统

搜索和跳转分四层，从近到远：

**1. 文件内搜索**

| 你想干 | VSCode | Neovim |
|--------|--------|--------|
| 搜索文本 | `Cmd + F` | `/关键词` → `Enter`（向前）/ `?关键词`（向后） |
| 下一个 / 上一个匹配 | `Enter` / `Shift + Enter` | `n`（next）/ `N` |
| 搜索光标下的词 | `Cmd + D`（选一下，其实不同） | `*`（向前）/ `#`（向后） |
| 清除高亮 | `Esc` | `:noh`（no highlight） |

> `*` 是最常用的——光标放变量上，按 `*` 立刻跳到下一处出现，不用敲关键词。

**2. 文件内直接跳转（不搜索）**

| 你想干 | VSCode | Neovim |
|--------|--------|--------|
| 文件头 / 文件尾 | `Cmd + ↑/↓` | `gg` / `G` |
| 跳到第 N 行 | `Ctrl + G` → 输行号 | `数字 + G`（如 `42G`）或 `:42` |
| 跳到行首 / 行尾 | `Home` / `End` | `0` / `$` |
| 跳到屏幕顶 / 底 | `PageUp` / `PageDown` | `H`（High）/ `L`（Low） |

**3. 跨文件搜索（telescope，kickstart 自带）**

| 操作 | VSCode | Neovim |
|------|--------|--------|
| 模糊搜文件名 | `Cmd + P` | `Space` `s` `f` |
| 全局搜文件内容 | `Cmd + Shift + F` | `Space` `s` `g`（实时 grep） |

**4. 跳转历史——这招在 VSCode 里没有**

vim 自动记录所有「大跳转」（搜索、跳行、跳定义、跳文件），形成轨迹。你可以原路后退/前进——就像浏览器的前进后退按钮：

| 操作 | VSCode | Neovim |
|------|--------|--------|
| 后退（回上一个位置） | `Alt + ←` | `Ctrl + o` |
| 前进（去下一个位置） | `Alt + →` | `Ctrl + i` |
| 查看跳转历史列表 | 无 | `:jumps` |

```
Ctrl+o 后退 ←      当前位置      Ctrl+i 前进 →
             ·  ·  ·  △  ·  ·  ·  ·  ·
            搜索   跳行   你   跳定义  跳定义
```

> **场景**：在文件 A 搜 `fn main` → `*` 下一个 → `gd` 跳定义（进了文件 B）→ 读完后跳到文件 C 的引用。`Ctrl + o` 一步步原路倒退回去。大脑不用记「我刚从哪来」，vim 帮你记——每次搜索、每次 `gd` 都自动留痕。

> vim 和 VSCode 的 `Ctrl + o`/`Ctrl + i` 看起来一样，但 **vim 的更细粒度**：它记录的是「每个光标位置的变更」，而不仅是「跨文件」。比如你在同一个文件里搜索 `error` → 按 `n` 跳了 3 处 → `Ctrl+o` 能退回到 3 个位置之前。VSCode 做不到这个精度。

---

## 2. 调试对比——这是 Neovim 的软肋

> 先说实话：**调试是 Neovim 目前最不如 VSCode 的地方。** 这里别抱幻想。

### VSCode 的调试

开箱即用：写个 `launch.json` → 按 `F5` → 断点、变量、调用栈、监视全在侧边栏，丝滑。

### Neovim 的调试

要装 `nvim-dap` + `nvim-dap-ui`，**每个语言还要单独配调试适配器**：

| 调试操作 | VSCode | Neovim（nvim-dap） |
|---------|--------|-------------------|
| 开始调试 | `F5` | 需自己映射键，比如 `Space + d c` |
| 打断点 | 点行号左边 | `:lua require'dap'.toggle_breakpoint()`（映射成键） |
| 单步步过 / 步入 | `F10` / `F11` | 自己映射键 |
| 查看变量 | 自动侧边栏 | dap-ui 浮窗（要装 dap-ui） |
| 调用栈 / 监视 | 侧边栏 | dap-ui（功能有，UI 不如 VSCode） |
| 配置成本 | 一个 `launch.json` | 每语言一段 Lua 配置 |

### 各语言调试现实

| 语言 | VSCode | Neovim | 评价 |
|------|--------|--------|------|
| **Rust** | CodeLLDB，丝滑 | nvim-dap + codelldb，能配通但要折腾 | 配好后可用，体验差一档 |
| **JS / Node** | 内置 debugger，零配置 | nvim-dap + js-debug-adapter | 能用，断点和单步都行 |
| **C++** | 配 launch.json | nvim-dap + codelldb/lldb | 都要配置，半斤八两 |

> **诚实建议**：调试阶段，你完全可以「编辑用 Neovim，调试切回 VSCode」。这不丢人，是务实的过渡。等你 Neovim 用熟了、愿意投入时间配 nvim-dap，再把调试也迁过去。

---

## 3. JS / TS 开发对比

这块 Neovim 和 VSCode 差距**很小**，因为用的都是 `typescript-language-server`。

| 功能 | VSCode | Neovim | 说明 |
|------|--------|--------|------|
| TS 智能补全 / 跳转 / 诊断 | 内置 | 装 `typescript-language-server`（`npm i -g typescript-language-server`） | 同一个 server，质量一致 |
| ESLint | 内置 / 插件 | eslint LSP | 配置好就一样 |
| Prettier 格式化 | 插件 | conform.nvim + prettier | 一样 |
| 自动 import | 内置 | tsserver 通过 LSP 提供 | 一样 |
| 运行 npm 脚本 | npm scripts 面板 | `:!npm run xxx` 或开终端 | Neovim 更原始 |
| ts/jsx 语法高亮 | 内置 | tree-sitter（kickstart 自带） | 一样准 |

> JS/TS 是迁移成本最低的语言——智能来自同一个地方，你迁过去几乎感觉不到智能下降。

---

## 4. Rust 开发对比——Neovim 的主场

**Rust 是 Neovim 表现最好的语言之一。** 因为 `rust-analyzer` 本来就是 LSP 原生设计，VSCode 和 Neovim 用的是同一个。

| 功能 | VSCode | Neovim | 说明 |
|------|--------|--------|------|
| rust-analyzer 智能 | rust-analyzer 扩展 | rust-analyzer（kickstart 配好） | **完全一致** |
| 补全 / 跳转 / 诊断 | ✅ | ✅ | 同一个 server |
| 代码操作（行灯泡） | ✅ | ✅ `Space + c a` | 一样 |
| inlay hints（类型提示） | ✅ | ✅ rust-analyzer 提供 | 一样 |
| 运行 cargo run / test | 终端或任务 | `:!cargo run` / `:!cargo test` | Neovim 直接调 |
| crate 版本提示 | 扩展 | crates.nvim | 显示依赖新版本 |
| 调试 | CodeLLDB | nvim-dap + codelldb | 唯一短板 |

推荐装 `rustaceanvim`——一个让 Rust 在 Neovim 里「一等公民」的插件包，把上面这些都整合好。

> 你现在正在学 Rust，**用 Neovim 写 Rust 是最佳搭配**：一边学语言，一边用最契合 Rust 生态的编辑器。rust-analyzer 的诊断信息能帮你理解 borrow checker 在说什么。

---

## 5. 格式化：如何让两边结果完全一致

**能做到，而且不难。** 关键认知：**格式化是独立程序干的，不是编辑器的功能。** 编辑器只是「调用格式化工具」。

```
你的代码 ──VSCode 调用──> prettier ──> 格式化结果
         ──Neovim 调用──> prettier ──> 完全一样的结果
```

两边一致的条件只有一条：**用同一个格式化工具 + 读同一份配置。**

### 各语言的格式化工具

| 语言 | 格式化工具 | 配置文件（必须放仓库里） | Neovim 怎么调 |
|------|-----------|------------------------|--------------|
| **Rust** | rustfmt（`cargo fmt`） | `rustfmt.toml`（通常不用写，默认就通用） | rustaceanvim / conform.nvim |
| JS/TS | prettier | `.prettierrc` / `.prettierignore` | conform.nvim |
| C++ | clang-format | `.clang-format` | conform.nvim |
| Python | black / ruff | `pyproject.toml` | conform.nvim |

> Neovim 侧统一用 **conform.nvim**——它就是个「跑 CLI 格式化工具」的壳，配一下工具名 + 开「保存时格式化」就行。

### 让两边一致的三条原则

1. **配置放进仓库**（committed），别写在编辑器的 settings 里。`.prettierrc` 这种文件提交到 git，两个编辑器都读它。
2. **不要在 VSCode `settings.json` 里写 prettier 规则**——移到仓库的 `.prettierrc`，VSCode 和 Neovim 都认它。
3. **两边都开「保存时格式化」**：VSCode 设 `editor.formatOnSave`，Neovim 在 conform.nvim 里设 `format_on_save`。

> ⚠️ **反例（一定会不一致）**：你在 VSCode 的 `settings.json` 里配了一套 prettier 规则，但仓库里没有 `.prettierrc`。Neovim 读不到那些规则，就用 prettier 默认值 → 两边格式不一样。
>
> **解法**：把规则从 VSCode settings 搬到仓库的 `.prettierrc`，两边都读它，从此一致。

> **Rust 是最省心的**：`cargo fmt` 是唯一标准，两个编辑器都调它，默认配置通用，结果天然一致。你正在学 Rust，这块直接不用管。

---

## 6. 快速上手策略——别一刀切

最大的坑是「从明天起全用 Neovim」——你会因为一点小事不顺手又退回 VSCode。正确做法是**渐进迁移**：

### 第一阶段：双开混用（1-2 周）

- **VSCode 干重活**：调试、复杂重构、不熟悉的代码库
- **Neovim 练轻活**：每天逼自己在 Neovim 里待 30 分钟——改小 bug、写笔记、读代码
- 目标：把通用操作表里的高频动作（`Space+f` 开文件、`g d` 跳定义、`gcc` 注释）练成肌肉记忆

### 第二阶段：日常编辑迁过去（第 3-4 周）

- 写代码的主力变成 Neovim
- 写这个仓库的 Markdown 笔记完全用 Neovim（装 render-markdown.nvim）
- 只有「调试」和「偶尔需要 VSCode 某个功能」时切回去

### 第三阶段：调试——最后的堡垒

到这一步你自然知道该怎么选：
- 要么花一个周末配好 nvim-dap，调试也迁过去
- 要么接受「调试留在 VSCode」——很多资深开发者就是这么干的，编辑 Neovim + 调试 IDE，这是合理的工作流

> 不要追求「100% Neovim」。工具是为你服务的，不是你为工具服务。

---

## 7. 诚实评估

### Neovim 还赢不了 VSCode 的地方

| 方面 | 现状 |
|------|------|
| 调试器 | VSCode 仍然更顺，Neovim 要折腾 |
| 多光标 | VSCode 的 `Cmd+D` 丝滑，Neovim 需插件且没那么顺 |
| 开箱即用 | VSCode 装完就能用，Neovim 要配 |
| 远程开发 | VSCode Remote 开箱即用，Neovim 靠 SSH + 配置同步 |
| 新人上手 | VSCode 当天会用，Neovim 要几周 |

### Neovim 赢 VSCode 的地方

| 方面 | 为什么 |
|------|--------|
| 速度 / 轻量 | 启动快，不吃内存，大文件不卡 |
| 终端原生 | SSH 上服务器，体验和本地一模一样 |
| 键盘流效率 | 熟练后手不离键盘，比鼠标快 |
| 配置可迁移 | 一份配置走遍所有机器，VSCode 的 settings 同步绑死账号 |
| 编辑模型 | vim 的「动词+对象」一旦内化，效率上限极高 |

---

## 8. 一句话总结

```
智能一致（同一个 LSP） → 差距在外壳和调试器
→ 日常编辑可以平滑迁过去
→ 调试是最后的堡垒，允许自己留在 VSCode
```

> 你的路线：现在在学 Rust，正好用 Neovim 写 Rust 练手——这是 Neovim 最强的场景。等 Rust 写顺了，编辑器的肌肉记忆也养成了，自然就回不去了。
