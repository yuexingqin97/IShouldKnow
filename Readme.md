# isk

> I Should Know —— 但我还是记下来了，怕下次又忘了。

## 这是什么

个人学习笔记 + 代码实验仓库，记录那些“我本该懂但偶尔还是会懵”的编程知识点。

## 📂 仓库结构

`_raw/` 下是用 **git submodule** 引用的开源电子书（只读引用上游，方便随时查阅、跟随更新）：

| 路径 | 来源 |
|---|---|
| `_raw/rust-by-example-cn` | [rust-lang-cn/rust-by-example-cn](https://github.com/rust-lang-cn/rust-by-example-cn) |
| `_raw/typescript-tutorial` | [xcatliu/typescript-tutorial](https://github.com/xcatliu/typescript-tutorial) |
| `_raw/rust-course` | [sunface/rust-course](https://github.com/sunface/rust-course) |

```bash
# clone 本仓库时一并拉取子模块内容
git clone --recursive <repo-url>
# 或 clone 之后再补
git submodule update --init

# 上游有更新时，同步到最新
git submodule update --remote
```

> 子模块本质是「指针」：书的内容仍存在各自上游仓库，本仓库只记录 URL + commit。

## 📌 更新原则

- 想学了就更新
- 不想学了就放着
- 发现 AI 给错了就记一笔
- 反正不会删

---

## 🤖 我的 AI 协作原则

1. **先问 AI，再自己验证** —— AI 给答案，我负责跑用例、改边界、写测试。
2. **“这个我记不住” → 记成笔记** —— 把 AI 的解释用自己的话重写一遍，才算真正“过脑”。
3. **跨语言对比优先** —— 用 C++ 理解 TS，用 Lua 理解 JS 原型，用已知映射未知。
4. **随时质疑 AI** —— 如果我怀疑 AI 错了，我会追问、构造反例，并把“翻车现场”也记下来。

---

## 🧭 写给未来的自己

> 这些笔记不是“标准答案”，而是“我在 AI 帮助下走过的思考路径”。
>
> 如果哪天我忘了，回来翻一翻，不是为了背答案，而是为了找回当时的思考方式。
>
> **在 AI 时代，会问问题比会背答案重要一万倍。**

---

## 😄 版权 & 使用

随意看，随意用，随意吐槽。  
但别问我“这么简单你也要记？”—— 因为我 **I Should Know**，但我偏要记。

## 备注

如果你误入此仓库，随便看，但别问我“这么简单你也要记？” —— 因为 I Should Know，但我偏要记。 😄