# Neovim 学习路线

> 目标是渐进式替代 VSCode：先用起来，再逐步加深。不要试图一周内把所有东西配好。

---

## 0. 为什么是 Neovim，不是 Helix、不是 VSCode？

决策链路：

```
想在终端里写代码
  → Helix：上手快（开箱即用），但无插件 = 天花板有限（无调试器、弱 Git、无 AI 集成）
  → Neovim：前期学习曲线陡（配 Lua + 记键位），但插件生态 ≈ VSCode 级别的可扩展性
  → VSCode：你会用，但你想离开 GUI
```

| 维度 | Neovim | Helix | VSCode |
|------|--------|-------|--------|
| 调试器 | ✅ nvim-dap | ❌ | ✅ |
| Git 面板 | ✅ fugitive / neogit | ⚠️ 仅 gutter 标记 | ✅ |
| 文件树 | ✅ neo-tree | ❌ | ✅ |
| 内置终端 | ✅ | ❌ | ✅ |
| LSP 补全 | ✅ 靠插件 | ✅ 内置 | ✅ |
| 多光标 | ✅ | ✅ | ✅ |
| 插件生态 | ✅ 海量 | ❌ 还没出 | ✅ 海量 |
| 配置语言 | Lua | TOML | JSON |
| AI 集成 | ✅ codecompanion / avante | ❌ | ✅ Copilot |

> Neovim 的编辑模型来自 vim（已有 30 年历史），社区资源、教程、StackOverflow 答案都是最多的。遇到问题搜得到。

---

## 1. 安装

```bash
brew install neovim
```

验证：

```bash
nvim --version   # 应该显示 NVIM v0.10.x 或更高
```

---

## 2. 学习路线（三阶段）

### 第一阶段：活下来（前 3 天）—— 先学会"在里面写代码"

**原则：不装任何插件。** 只用 Neovim 原生功能。

#### 第一天：启动 + 内置教程

```bash
nvim                    # 打开 Neovim
:Tutor                  # 进入内置互动教程（约 30 分钟做完）
```

教程覆盖：hjkl 移动、i/a/o 进入插入模式、Esc 退出、w/b 按词跳转、dd/yy/p 删除复制粘贴、u 撤销。

> 跑完 Tutor 后把 [[Neovim速查]] 放旁边——这张表浓缩了教程所有核心操作，刷题时忘了就瞟一眼。

#### 第二天：刻意练习以下动作

把这几个动作练到不用想：

| 操作 | 按键 | 记忆 |
|------|------|------|
| 光标上/下/左/右 | `h` `j` `k` `l` | 左最左，右最右 |
| 进入插入模式 | `i`（光标前）/ `a`（光标后）/ `o`（新开一行） | |
| 退出插入模式 | `Esc` | 回 Normal 模式 |
| 删除一行 | `dd` | delete |
| 复制一行 | `yy` | yank |
| 粘贴 | `p`（光标后）/ `P`（光标前） | paste |
| 撤销 / 重做 | `u` / `Ctrl + r` | undo / redo |
| 保存 | `:w` | write |
| 退出 | `:q` | quit |
| 不保存强制退出 | `:q!` | quit with force |

**练习**：打开 `_raw/rust-by-example-cn` 里的随便一个 `.rs` 文件，用 `hjkl` 浏览，用 `dd`/`yy`/`p` 改写几行，存盘退出。

#### 第三天：搜索 + 跳转

| 操作 | 按键 |
|------|------|
| 搜索（向下） | `/关键词` → `Enter` → `n` 下一处 / `N` 上一处 |
| 按词跳转 | `w`（下一个词首）/ `b`（上一个词首）/ `e`（词尾） |
| 跳行首 / 行尾 | `0`（行首）/ `$`（行尾） |
| 跳到文件头 / 尾 | `gg` / `G` |
| 跳到指定行 | `数字 + G`（如 `42G` 跳到第 42 行） |
| 翻半页 | `Ctrl + d`（下翻）/ `Ctrl + u`（上翻） |

> 三天过去了。你还没有一棵文件树、没有代码补全、没有语法高亮——没关系，你能在里面移动和编辑了。这是地基。

---

### 第二阶段：装起步配置（第 4 天）—— 获得 VSCode 基本体验

单靠原版 Neovim，你连 `.rs` 文件的语法高亮都没有。但这个年代不用从零手写配置了——用 **kickstart.nvim**，一个 400 行的起步配置，装上就有：

- LSP 补全 + 诊断（Rust/TS/C++ 全支持）
- tree-sitter 语法高亮
- telescope 模糊搜索文件
- 文件树
- 状态栏
- git 行内标记

```bash
# 备份可能已有的配置（如果有）
mv ~/.config/nvim ~/.config/nvim.bak 2>/dev/null
mv ~/.local/share/nvim ~/.local/share/nvim.bak 2>/dev/null

# 克隆 kickstart
git clone https://github.com/nvim-lua/kickstart.nvim.git ~/.config/nvim

# 首次启动会自动装插件（等几分钟）
nvim
```

> 第一次打开会下载一堆插件——这是正常现象，以后不会了。等它跑完，你就有了一个"轻量 VSCode"的起点。

启动后你看到的：

```
┌───┬────────────────────────────────────────┐
│ N │ 代码编辑区                              │
│ E │                                        │
│ O │   Rust 代码高亮 ✅                      │
│ - │   LSP 补全 + 错误提示 ✅                │
│ T │   git 行标记 ✅                         │
│ R │                                        │
│ E │                                        │
│ E │                                        │
└───┴────────────────────────────────────────┘
```

#### 第二阶段必修快捷键

| 操作 | 按键 | 说明 |
|------|------|------|
| 模糊搜索文件 | `Space` `s` `f` | telescope 查找文件 |
| 全局搜索文本 | `Space` `s` `g` | telescope 实时 grep |
| 打开/关闭文件树 | `\` | neo-tree 侧边栏 |
| 切换已开文件 | `Space` `Space` | telescope buffers |
| 格式化 | `Space` `f` | conform.nvim |
| 跳转到定义 | `g d` | LSP |
| 查看引用 | `g r` | LSP 查找所有引用 |
| 重命名符号 | `Space + r n` | LSP |
| 查看错误信息 | `Space` `s` `d` | LSP 诊断 |
| 代码补全 | 输入时自动弹出 / 手动 `Ctrl + Space` | LSP |
| 水平分屏 | `:split` | 上下两个编辑区 |
| 垂直分屏 | `:vsplit` | 左右两个编辑区 |
| 切换分屏 | `Ctrl + W + h/j/k/l` | |
| 关闭分屏 | `Ctrl + W + q` | |

---

### 第三阶段：按需增配（之后逐步）

kickstart 给了骨架，缺什么再加。以下是常见的加配场景——**不急着搞，遇到需求再回来加**：

| 我想要 | 插件 | 一句话 |
|--------|------|--------|
| Git 面板（stage/diff/blame） | neogit | `:Neogit` 打开完整的 Git 面板 |
| 调试器 | nvim-dap + nvim-dap-ui | 断点、变量查看、单步执行 |
| 多光标（比 vim 原生的强） | multicursors.nvim | 选中 → 多处同时编辑 |
| 彩虹括号 | rainbow-delimiters.nvim | 嵌套括号颜色交替 |
| 自动括号配对 | nvim-autopairs | 输 `(` 自动补 `)` |
| 文件树图标 | nvim-web-devicons | neo-tree 里显示文件图标 |

#### Markdown 笔记（对你这个仓库特别重要）

这个仓库全是 Markdown 笔记，所以这块值得专门说。kickstart 自带 tree-sitter markdown 高亮，已经够编辑了。但 Markdown 的痛点是——**编辑时看到的是 `#` 和 `|---|` 源码，不是渲染后的样子**。要解决，装这两个：

| 插件 | 干嘛的 | 推荐度 |
|------|--------|--------|
| `render-markdown.nvim` | **编辑器内直接渲染**：标题变大字带背景、表格画框、代码块加边框、checkbox 变 ☐/☑。不用开浏览器，写的时候就是渲染样 | 🔥 强烈推荐 |
| `markdown-preview.nvim` | 快捷键开浏览器实时预览，敲一个字右边刷新一个字 | 写长文档时用 |
| `obsidian.nvim` | 模仿 Obsidian 的 vault：`[[链接]]` 跳转、反查、模板 | 想把仓库变知识库再说 |
| `mkdnflow.nvim` | 轻量 wiki-link 跳转 | obsidian.nvim 的轻量替代 |

> 你 `LEARNING.md` 里的 `[[Terminal/基础]]` 这种写法就是 wiki-link——以后装了 obsidian.nvim，光标放上面就能跳过去。

---

## 3. Claude Code + Neovim 协作

### 3.1 设 Neovim 为默认编辑器

```bash
# 添加到 ~/.zshrc
export EDITOR=nvim
```

Claude Code 编辑文件时会自动在你的 Neovim 里打开。

### 3.2 Neovim 内嵌终端跑 Claude

```
┌──────────────────┬──────────────────┐
│   Neovim 编辑区   │  :terminal claude │
│                  │                  │
│   你的代码        │  Claude Code     │
│                  │  交互对话         │
│                  │                  │
└──────────────────┴──────────────────┘
```

```vim
:vsplit              " 垂直分屏
:terminal            " 打开终端
claude               " 启动 Claude Code
```

切换分屏：`Ctrl + W + h`（左）/ `Ctrl + W + l`（右）

### 3.3 AI 内联插件（以后再说）

如果你想让 Claude 直接出现在编辑器内部（选中代码 → Claude 改），装 codecompanion.nvim。kickstart 的插件配置文件在 `~/.config/nvim/lua/plugins/`——在那下面建一个文件加插件声明就行。

> 等你 Neovim 用得顺手了再搞这个。当前阶段频繁切换窗口反而帮助记忆快捷键。

---

## 4. 常见坑

| 坑 | 现象 | 解决 |
|----|------|------|
| `Esc` 太远 | 小指够不到 Esc | 把 `jk` 映射成 Esc：kickstart 默认已配（快速连按 `j` `k` 退出插入模式） |
| 光标移动很慢 | 手总想去摸方向键 | 把方向键禁掉：加到 kickstart 配置里，逼自己用 hjkl |
| 复制到系统剪贴板 | `yy` 复制的内容外部贴不了 | 确认 `brew install pbcopy` 或检查 Neovim 的 `+clipboard` 支持（`nvim --version \| grep clipboard`） |
| 插件报错 | 启动一堆红字 | 大概率是某个插件更新不兼容，先 `:Lazy update` 更新一波 |
| 缩进一团糟 | 贴代码进去缩进爆炸 | `:set paste` 进粘贴模式，贴完 `:set nopaste` |
| 不知道怎么退 | 按什么都在叫 | `Esc Esc :q! Enter`——万能退出公式 |

---

## 5. 下一步

完成一个阶段再进下一个：

1. [ ] 终端美化完成（Oh My Zsh + 字体 + 配色）
2. [ ] 第一阶段：跑完 `Tutor` + 三天练习
3. [ ] 第二阶段：装 kickstart.nvim，用 Neovim 写 Rust 练习
4. [ ] 设 `EDITOR=nvim`，体验 Claude + Neovim 分屏协作
5. [ ] 第三阶段：按需加插件（Git 面板、调试器等）
6. [ ] 从 VSCode 渐进迁移：参考 [[VSCode对照]]，别一刀切
7. [ ] 刷 Rustlings：参考 [[Rustlings]]，每天 3-5 道，周末攻克 move_semantics 和 lifetimes
8. [ ] 未来：考虑装 AI 内联插件（codecompanion.nvim）

---

## 6. 跨平台：Windows 上也能用

比终端那套**还容易复现**——因为 Neovim 的配置是纯 Lua 文件，和操作系统无关。

### 全部可跨平台

| 组件 | 跨平台？ | 说明 |
|------|---------|------|
| Neovim 本体 | ✅ | 原生 Windows 版，`winget install Neovim.Neovim` |
| `~/.config/nvim/` 配置 | ✅ **100% 通用** | Lua 文件直接拷过去，行都不用改 |
| kickstart.nvim | ✅ | 同一个 `git clone`，只改目标路径 |
| LSP 服务器（rust-analyzer、tsserver） | ✅ | 都有 Windows 原生版 |
| tree-sitter 语法高亮 | ✅ | 内建在 Neovim 里，不依赖 OS |
| telescope 模糊搜索 | ✅ | 纯 Lua 插件 |
| Nerd Font | ✅ | 同一字体文件 |

### 唯一区别：安装命令 + 配置路径

```bash
# Mac
brew install neovim
# 配置路径：~/.config/nvim/

# Windows
winget install Neovim.Neovim
# 配置路径：~/AppData/Local/nvim/
```

然后把 Mac 的 `~/.config/nvim/` 拷到 Windows 的 `~/AppData/Local/nvim/`，打开就是一样的编辑器——Dracula 配色、LSP 补全、telescope 搜索、所有快捷键，全部一致。

### 为什么这么容易跨平台？

```
Neovim Lua 配置  ← 不碰 OS API
       │
       ├── LSP 协议  ← 标准网络协议，和 OS 无关
       ├── 文件路径   ← Lua 的 path 处理跨平台
       └── 插件       ← 纯 Lua，不依赖系统库
```

> 又是一个「配置和平台解耦」的例子——和 [[VSCode对照]] 里讲的 LSP 一样，Neovim 的配置是纯文本 + 标准协议调用，不碰操作系统 API。这和你刚配的终端是两个极端：终端美化拆成「终端壳（iTerm2/Windows Terminal）」+「Shell 内部（zsh + p10k）」，壳要换，内部不变；Neovim 干脆连壳都不用换。
