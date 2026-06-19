# LEARNING

> 不是课表，是方向感。看心情切换完全没问题——今天想写 Rust 就写 Rust，明天被 UE 战斗 bug 搞烦了就深挖 C++。

## 我的时间底数

| | 能拿出多少 | 适合干什么 |
|---|---|---|
| 工作日 | ~40 分钟/天 | 碎片深挖、读一小节、翻源码 |
| 周末 | ~5 小时/天 | 写代码、专题攻坚、推 Rust 项目 |

核心原则：**碎片时间维护已会技能 + 浅浅推进新知识，整块时间留给 Rust 写项目。** 碎片时间别贪深度，整块时间别刷文档不写代码。

---

## C++ / UE —— 打磨层

我不是在"学 C++"，我是在**用 C++ 写战斗 gameplay + 编辑器工具**。打磨方向两件事：日常写代码时多挖一层引擎机制 + 系统跟进 C++20/23 里真正对 UE 有用的特性。

### 日常碎片深挖（工作日，每次多停 5 分钟）

- **UE 反射与 GC**——`UPROPERTY()`、`UFUNCTION()` 展开后到底生成了什么代码，GC 怎么遍历 `UObject` 图。写 `TWeakObjectPtr` 的时候脑补 GC 在干什么。
- **网络复制**——挑一个我写过的战斗技能，从 Server `ActivateAbility` 跟到 Client 的 `OnRep_`。哪个 RPC 用 reliable？哪个不用？为什么？
- **容器选择**——`TArray::Reserve` vs `std::vector::reserve` 内存策略差异；什么时候 `TMap` 不如 `TArray + TArray::FindByKey`（元素少时 cache 友好）。
- **委托系统**——单播 / 多播 / 动态多播在战斗事件注册的正确姿势。析构时没 `RemoveAll(this)` 的下场——亲手造一次 crash 就记住了。

> 这些不需要专门排时间。日常写 gameplay 代码时多停 5 分钟问一层就够了。

### C++20 / 23 新语法（我真正想搞懂的 8 个特性）

不是背特性列表——每个都对准"在我的战斗代码里有什么用"：

| 特性 | 关键字 | 在 UE 战斗代码里的场景 |
|---|---|---|
| **协程** 🔥 | `co_await` `co_return` `co_yield` | 技能时间线、异步加载、分帧执行的编辑器任务——替代那些靠 Tick 数帧的状态机 |
| **Concepts** | `requires` `concept` | UE 模板展开报错天书——concept 给模板加约束，报错从 300 行缩到 5 行 |
| **Ranges** | `std::ranges::filter` `\|` `std::views` | 找"所有血量 < 30% 的队友"变成一行 pipeline，不用手写 for 循环 |
| **`std::span`** | `std::span<T>` | 传数组不传裸指针 + 长度，编译器帮我挡越界 |
| **`std::expected`** (23) | `and_then` `or_else` | 类似 Rust `Result`——战斗计算用返回值而非异常处理错误 |
| **`std::format`** (20) / `std::print` (23) | | UE 的 `FString::Printf` 之外多一个类型安全的格式化选项 |
| **Designated init** (20) | `Foo{.x=1, .y=2}` | 结构体初始化像 C# 一样写字段名，不靠位置猜 |
| **`<=>`** (20) | `auto operator<=>(...) = default;` | 比较运算符一行搞定 |

> 协程是重头戏——周末找一块时间看 cppreference 的协程示例，然后拿一个我项目里"分帧 Tick 的状态机"尝试改成协程版。**自己改一遍比读十篇博客有用。**

### 周末系统专题（一次一个，别贪多）

- **GAS 源码**——`UAbilitySystemComponent::ActivateAbility` 完整调用链，Attribute 变化怎么传播到 UI。
- **编辑器工具**——看一个我常用的编辑器面板的 Slate 实现，模仿它做一个简化版。
- **协程在 UE 里的实践**——UE5 的 `UE5Coro` 插件或自己写一个简单的 `TFuture`→协程桥。

---

## TypeScript / Puerts —— 打磨层

核心认知：**Puerts 里的 TS 不等于前端的 TS。** 我列了一份完整的 JS/TS 深度计划（10 项），但同时得补上 Puerts 专属的边界知识——TS ↔ C++ 怎么交互才是关键。

### 🥇 第一梯队：异步 + 闭包 + this（Puerts 里每天都碰到）

#### 1. 异步编程（Promise / async-await）🔥 Puerts 高频

JS 最核心、最不同于 C++ 的领域。

- **必会**：`Promise` 手写实现、`async/await` 本质（generator + 自动执行器）、`Promise.all` / `race` / `allSettled` 区别
- **坑点**：`for...of` + `await` 的串行/并行控制、`forEach` 不支持 `await`（要用 `for...of`）
- **进阶**：手写一个简单的 `async/await` 编译器，理解底层
- **Puerts 场景**：技能 timeline 的异步等待、资源异步加载、网络 RPC 回调链

#### 2. 闭包 + 高阶函数（彻底搞懂）🔥 Puerts 高频

C++ 有 lambda，但 JS 的闭包更"活"——C++ lambda 捕获是**显式**的（`[=]` `[&]`），JS 闭包是**隐式**的，更容易踩坑。

- **必会**：闭包的内存泄漏场景、柯里化、防抖 / 节流手写
- **进阶**：用闭包实现"私有变量"（替代 TS `private`，因为运行时不存在）
- **Puerts 场景**：闭包持有 `UObject` 引用而没解绑委托 → UE 版内存泄漏（和浏览器 DOM 监听器同模式，换个场景）
- **坑点**：事件回调注册后忘记 `RemoveAll(this)`，闭包里引的 `UObject` 永远不会被 GC

#### 3. `this` 绑定规则（4 条铁律）⚡ Puerts 中高

C++ 的 `this` 是静态的，JS 是**动态**的——这是思维方式上的分水岭。

- **必会**：默认绑定、隐式绑定、显式绑定（`call/apply/bind`）、箭头函数绑定
- **实战**：能一眼看出 `setTimeout` 里的 `this` 指向谁
- **Puerts 场景**：Puerts 里 `this` 通常指向绑定后的 `UObject`，比浏览器里更"乖"，但 `setTimeout` 回调里依然可能丢

---

### 🥈 第二梯队：TS 类型编程

#### 4. TS 类型体操（进阶类型编程）⚡ 中优先级

我已经会用 `interface`，接下来该玩真的了。

- **必会**：`keyof`、`typeof`（类型查询）、`infer`（模式匹配）、`extends`（条件类型）
- **实战**：实现 `DeepReadonly`、`Pick`、`Omit`、`ReturnType` 等内置工具类型
- **推荐**：刷 [Type-Challenges](https://github.com/type-challenges/type-challenges)（从 easy 开始）
- **Puerts 场景**：更多是**读** `.d.ts` 声明文件理解 Puerts 的类型暴露，而非手写高级类型。但理解 `infer` 能帮我读懂 UE 绑定生成的类型声明。

#### 5. 泛型 + 类型守卫（实战利器）⚡ 中优先级

- **必会**：`is` 关键字实现自定义类型守卫、`asserts` 断言
- **场景**：写一个 `isArrayOfStrings` 让 TS 自动收窄类型
- **Puerts 场景**：TS 侧收到 UE 返回的模糊类型时，用类型守卫收窄——不用到处 `as any`

---

### 🥉 第三梯队：JS 独有机制（C++ 没有的）

#### 6. Proxy / Reflect（元编程）📖 了解即可

- **必会**：`Proxy` 拦截 `get/set/deleteProperty`，实现响应式（Vue 3 核心）
- **对比**：Lua 有 `__index`/`__newindex`，JS 的 Proxy 更强大（能拦截 13 种操作）
- **Puerts 现实**：我不在 UE 里写 UI 框架，实用价值有限。但用来理解 Vue 原理和 Lua 元表对比，值得一看。

#### 7. 迭代器 + 生成器（`Symbol.iterator`）📖 了解即可

- **必会**：让自定义对象支持 `for...of`，实现 `[Symbol.iterator]` 方法
- **进阶**：用生成器实现"懒加载序列"（斐波那契数列无限流）
- **注意**：理解 async/await 底层需要 generator 基础——这一点已在第一梯队覆盖。gameplay 代码里很少需要自定义迭代器。

#### 8. 模块系统（ESM vs CommonJS）⚡ 理解即可

- **必会**：`import/export` 和 `require/module.exports` 的区别、循环引用处理
- **坑点**：`__dirname` 在 ESM 中不可用（需用 `import.meta.url`）
- **Puerts 场景**：Puerts 的模块加载机制依赖这个，"理解即可"级别

---

### 🛠 第四梯队：工程化 + 生态

#### 9. 打包工具原理 📖 了解即可

不是让我配 webpack——是理解 **AST → 依赖图 → 打包产物** 的过程。

- **练习**：手写一个极简的 `bundle` 工具（50 行代码）
- **更重要**：Puerts 本身的构建原理——这个优先级比通用打包工具高

#### 10. 调试 + 性能分析 ⚡ 实用技能

- **必会**：Chrome DevTools 的 Performance / Memory 面板、`console.trace` 追踪调用栈
- **场景**：用 `performance.mark` 测量函数耗时
- **Puerts 场景**：用 `performance.mark` 测 C++↔TS 调用边界的耗时——这才是 Puerts 性能分析的关键

---

### ⚠️ Puerts 专属补充（这份计划最大的缺口）

上面 10 项是"TS 语言本身"的深度——但 Puerts 的核心问题是 **TS ↔ C++ 的边界**怎么设计才不翻车。这是我自己必须补的：

- **绑定机制**——读 Puerts 源码里一个典型类的绑定（比如 `FVector` 怎么暴露给 TS）。TS 侧怎么看到 C++ 类型，`UObject` 的 `this` 在 TS 里和 C++ 里是不是同一个东西。
- **性能边界**——哪种调用 C++→TS 最贵？TS→C++ 呢？循环里调 `ue.FVector.Dist()` 和先存一个本地引用有区别吗。
- **GC 交互**——TS 对象持有 `UObject` 引用时，UE 的 GC 怎么知道不能回收？V8 GC 和 UE GC 两个运行时怎么协作。
- **架构取舍**——什么逻辑放 C++（频繁调用 / 性能敏感），什么放 TS（迭代快 / 热更），什么放蓝图（策划可调）。拿我一个战斗技能做"分家"练习：画出它在这三层之间的数据流。
- **蓝图 ↔ TS 交互**——蓝图调 TS 函数、TS 调蓝图节点的正确姿势。

---

## Rust —— 构建层（Minecraft 项目驱动）

目标：**今年内用 Rust 启动 Minecraft 个人项目，且持续推进。** 不是我工作的语言，是我想长期持有的第二把刀。

### 第一阶段：基础（4-6 个周末，每天 5h）

`_raw/rust-course`（语言圣经）和 `_raw/rust-by-example-cn`（通过例子学）交替看。每章读完自己敲一遍、改一行、猜编译输出、验证——**不自己踩一遍 borrow checker 的报错等于没学。**

- 周末 1-2：**所有权 · 借用 · 生命周期**——Rust 和 C++ 最大的分水岭。这三个概念是我从 C++ 迁移到 Rust 最需要"换脑子"的地方。
- 周末 3-4：**枚举 · 模式匹配 · `Result`/`Option`/`?` · 泛型与 trait**。
- 周末 5-6：**智能指针（`Box`/`Rc`/`Arc`/`RefCell`）· 并发基础（`Send`/`Sync`/`Mutex`/`channel`）**。

> 每读完一章用自己的话写笔记。要建笔记目录的时候叫我。

### 第二阶段：小项目过渡（2-3 个周末）

进 Minecraft 之前先写几个单文件小东西练手感——目的是**写 Rust 不再每一行都卡在 borrow checker 上**：

- **CLI 工具**——文件搜索 / 重命名（`clap` + `std::fs` + `rayon` 并行遍历）
- **终端小游戏**——贪吃蛇或井字棋（`crossterm` 终端渲染）

### 第三阶段：Minecraft（后续周末持续投入）

选 **Bevy**（Rust ECS 框架，做体素游戏天然契合），逐步攻克：

1. 方块世界 + 基本移动（native，先不管 wasm）
2. Chunk 管理 + 无限地形生成（噪声函数）
3. 方块放置 / 破坏 + 简单光照
4. 网络同步

> 目标不是"今年做完"，而是**今年一直在做**。每次周末推一点，工作日 40 分钟翻 Bevy 文档或画方块存储的数据结构。

---

## Mac / 终端 —— 工具层

> 刚切换到 Mac，终端和系统操作从零开始。这不是"学一门语言"，是**把工作环境弄顺手**。

### 优先级

1. **终端基础 + iTerm2 快捷键**——先会用，再谈效率。笔记在 [[Terminal/基础]]
2. **快捷键迁移（Windows → Mac）**——肌肉记忆转换，随手查。笔记在 [[Terminal/快捷键迁移]]
3. **美化终端**——好看 = 更愿意用。方案在 [[Terminal/美化方案]]，建议分步搞，别一次全上
4. **Homebrew**（macOS 包管理器）——之后装东西不用去官网下 `.dmg`，`brew install xxx` 一行搞定
5. **macOS 常用操作**——Spotlight、快捷键、多桌面、分屏——这些后面再补笔记

### 学法

- 日常操作刻意用终端代替 Finder（cd/ls/mkdir/touch）
- 美化部分分步搞：先 Oh My Zsh + 配色（5 分钟）→ 之后有空再上 p10k + 插件
- 遇到不会的操作就问，记到 [[Terminal/基础]] 里

> 零专项时间投入。日常用，日常查，两周就熟了。

---

## Python —— 旁观层

目标只有"看得懂 AI 写的脚本"。**不需要计划，一个速查清单 + 多看就够。**

| 遇到的模式 | 一句话说明 |
|---|---|
| `argparse` / `click` | 命令行参数解析——看 `add_argument` 那块就行 |
| `pathlib.Path` | 现代文件路径操作，替代 `os.path` |
| `subprocess.run(...)` | 调用外部命令，类似 C++ `system()` 但可控 |
| `requests.get(...)` | HTTP 请求，几乎每个 AI 脚本都在用 |
| `@dataclass` | 类似 C++ struct，不用手写 `__init__` |
| `[x for x in y if cond]` | list comprehension——看不懂就展开成 for 循环 |
| `with open(...) as f:` | 上下文管理器，作用 ≈ C++ RAII，自动关资源 |
| `f"...{var}..."` | f-string，Python 版格式化字符串 |

学法就一条：**AI 写了脚本 → 跑通 → 打开看一眼 → 遇到不认识的语法问 Claude → 下次我就能读了。** 零专项时间投入。

---

## 我的节奏

```
工作日 40min（3-4 天）:  C++/UE 碎片深挖 + Puerts 边界理解
工作日 40min（1-2 天）:  Rust 翻一章书 / 小练习 / Bevy 文档
周末 5h 主体:           Rust 主攻（写代码 > 看书）
周末 5h 里抽 1h:        C++20/23 专题 或 GAS 源码 或 编辑器工具
随时:                   Python 看脚本，不懂就问
```

> 看心情切换完全没问题——**碎片时间别贪深度，整块时间别刷文档不写代码。** 这两条比任何计划都管用。

---

## 接下来 2 个月焦点（从上面挑出来的）

上面东西很多，我不可能全速推进。这 2 个月先聚焦：

1. **C++20 协程**——周末抽一块时间，把一个分帧状态机改成协程版
2. **Puerts 绑定 + GC**——读 Puerts 源码里一个类的完整绑定链路
3. **Rust 所有权三章**——周末主力推进，工作日翻 Bevy 文档
4. **TS 异步 + 闭包**——工作日碎片深挖，配合 Puerts 场景练习

2 个月后再复盘，调整优先级。
