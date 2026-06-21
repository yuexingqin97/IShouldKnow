# Rustlings 刷题工作流

> Neovim + Rustlings 搭配：终端编辑器 + 编译驱动学习。这套配置让你全程不离开键盘。

---

## 0. 你已就绪的环境

| 组件 | 状态 |
|------|------|
| Neovim + kickstart | ✅ 行号、语法高亮、补全、文件树 |
| rust-analyzer | ✅ LSP 补全 + 错误诊断 |
| rustfmt | ✅ 保存时自动格式化 |
| rustlings 6.5.0 | ✅ 94 道题，24 个类别 |

---

## 1. 启动工作流

```bash
# 1. 找个地方初始化 rustlings（如果还没 init）
cd ~/Projects
rustlings init            # 在当前目录生成 exercises/ 和 Cargo.toml

# 2. 用 Neovim 打开
cd rustlings
nvim exercises/

# 3. 开文件树（按 \），选一道题打开

# 4. 分屏——右边跑 rustlings
# 在 Neovim 里：
:vsplit                   " 垂直分屏
Ctrl+w l                  " 跳到右边
:terminal                 " 开内置终端
rustlings run             " 启动（自带文件监听，:w 保存即重编译）
```

效果：

```
┌───────────────────┬─────────────────────┐
│  Neovim 编辑区     │  :terminal           │
│  exercises/       │  rustlings run       │
│  01_variables/    │                      │
│    variables1.rs  │  ⚠ 编译失败           │
│                   │  error[E0308]:       │
│  let x = 5;      │    mismatched types  │
│     ─改─→ :w ────┼──→ ✅ 编译通过          │
│                   │  "练习题 2/94"        │
└───────────────────┴─────────────────────┘
```

### 分屏操作速查

| 操作 | 按键 |
|------|------|
| 垂直分屏 | `:vsplit` |
| 跳到左 pane | `Ctrl+w` `h` |
| 跳到右 pane | `Ctrl+w` `l` |
| 调宽度 | `Ctrl+w` `>` / `Ctrl+w` `<` |
| 关闭当前 pane | `Ctrl+w` `q` |
| 退出终端模式 | `Ctrl+\` `Ctrl+n`（之后才能切 pane） |

> ⚠️ 在终端 pane 里不能直接用 `Esc` 或 `Ctrl+w`——那是发给 rustlings 的。先按 `Ctrl+\` `Ctrl+n` 退出终端模式，然后才能切窗。

---

## 2. 保存布局

Neovim 能保存分屏布局，下次打开原样恢复：

```vim
:mksession! ~/.config/nvim/sessions/rustlings.vim
```

**恢复：**

```bash
# 启动时恢复
nvim -S ~/.config/nvim/sessions/rustlings.vim
```

或者在 Neovim 里：

```vim
:source ~/.config/nvim/sessions/rustlings.vim
```

> 建议用 kickstart 的快捷键 `Space` `s` `.`（recent files）找上次打开的文件——比恢复 session 更轻量。session 保存的是完整布局（分屏、光标位置、寄存器），适合你想精确恢复复杂分屏布局时用。

---

## 3. rustlings 命令速查

```bash
rustlings run              # 运行下一道待完成的题（自带文件监听）
rustlings run variables1   # 运行指定题
rustlings hint             # 看当前题的提示
rustlings hint variables1  # 看指定题的提示
rustlings check-all        # 编译所有题，标记完成/待做
rustlings reset            # 重置当前题（改坏了想重来）
```

> `rustlings run` 本身就带文件监听——你在左边 `:w` 保存，右边自动重新编译。不需要旧版的 `watch` 参数。

---

## 4. 题目清单（94 道，24 类）

| # | 类别 | 题目数 | 难度 | 学什么 |
|---|------|-------|------|--------|
| 1 | `00_intro` | 2 | 🟢 | Hello World，感受编辑流 |
| 2 | `01_variables` | 6 | 🟢 | 变量绑定、mut、类型推断 |
| 3 | `02_functions` | 5 | 🟢 | 函数签名、返回、语句 vs 表达式 |
| 4 | `03_if` | 3 | 🟢 | if/else、if 是表达式 |
| 5 | `04_primitive_types` | 6 | 🟢 | 基本类型：bool/int/char/元组/数组 |
| 6 | `05_vecs` | 2 | 🟢 | Vec 基本操作 |
| 7 | `06_move_semantics` | 6 | 🟡 | **所有权移动、借用、clone**——Rust 核心 |
| 8 | `07_structs` | 3 | 🟢 | 结构体定义和初始化 |
| 9 | `08_enums` | 3 | 🟢 | 枚举 + match |
| 10 | `09_strings` | 4 | 🟡 | String vs &str、UTF-8 |
| 11 | `10_modules` | 3 | 🟢 | mod、use、pub |
| 12 | `11_hashmaps` | 3 | 🟢 | HashMap 操作、entry API |
| 13 | `12_options` | 3 | 🟡 | Option、unwrap/map/and_then |
| 14 | `13_error_handling` | 6 | 🟡 | Result、?、自定义错误 |
| 15 | `14_generics` | 2 | 🟡 | 泛型函数和结构体 |
| 16 | `15_traits` | 5 | 🟡 | Trait 定义和实现 |
| 17 | `16_lifetimes` | 3 | 🔴 | **生命周期**——最抽象的部分 |
| 18 | `17_tests` | 4 | 🟢 | `#[test]`、assert |
| 19 | `18_iterators` | 5 | 🟡 | Iterator、map/filter/collect |
| 20 | `19_smart_pointers` | 8 | 🔴 | Box/Rc/Arc/RefCell——运行时借用 |
| 21 | `20_threads` | 3 | 🟡 | thread::spawn、Mutex、channel |
| 22 | `21_macros` | 4 | 🟡 | 声明宏、`macro_rules!` |
| 23 | `22_clippy` | 2 | 🟢 | Clippy lint 提示 |
| 24 | `23_conversions` | 2 | 🟡 | From/Into、TryFrom |

加上中间的 **quizzes**（综合小测）。

---

## 5. 要刷多久？

| 阶段 | 题量 | 预估时间 | 备注 |
|------|------|---------|------|
| intro ~ primitive_types（第 1-5 类） | ~22 题 | 2-3 小时 | 纯热身，练 Neovim 操作 |
| vecs ~ enums（第 6-9 类） | ~14 题 | 2-3 小时 | 顺畅 |
| **move_semantics**（第 7 类） | 6 题 | 1-2 小时 | 🔥 重点花时间理解，别快进 |
| strings ~ error_handling（第 10-14 类） | ~19 题 | 3-4 小时 | |
| generics ~ lifetimes（第 15-17 类） | 10 题 | 2-3 小时 | 🔥 lifetimes 是难点 |
| tests ~ macros（第 18-22 类） | ~24 题 | 4-5 小时 | |
| conversions + quizzes | ~10 题 | 1-2 小时 | |

**总计：约 15-20 小时。** 按你每天 40 分钟工作日 + 周末 5 小时，**2-3 周能刷完。**

> 重点花时间的两个地方：**move_semantics**（所有权心智模型）和 **lifetimes**（最抽象）。这两个急不得，卡住是正常的。

---

## 6. 刷题技巧

### 善用 rustlings hint

```vim
:terminal
rustlings hint              " 看当前题的提示
```

有时候提示里直接就有答案——不是让你抄，是让你理解之后自己能写出来。

### 用 `grd` 看定义

遇到不认识的类型（比如 `&str` vs `String`），光标放上面按 `g` `r` `d`，跳到标准库定义——比打开浏览器查快。

### 搜之前写过的模式

```vim
Space s g                  " 全局搜索
" 输入：fn main
" 看看前面题目的 fn 签名怎么写的
```

### 做完一类后 mark

在 `LEARNING.md` 或 `日志/` 里记一句"今日刷完 01_variables，记住了 mut 和 shadowing 的区别"——自己的话写一遍比刷十道题有用。

---

## 7. 下一步

1. [ ] `rustlings init` 初始化（如果需要）
2. [ ] `nvim exercises/` → `\` 开文件树 → 选 `00_intro/intro1.rs`
3. [ ] `:vsplit` + `:terminal` + `rustlings run`，开始第一道题
4. [ ] 每天刷 3-5 道，不求快（40 分钟刚好）
5. [ ] 周末多刷，拿下 move_semantics 和 lifetimes
