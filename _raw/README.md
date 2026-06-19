# _raw — 开源电子书（git submodule）

三本只读引用上游的开源书，用于本地查阅和学习。

## 📚 清单

| 路径 | 书名 | 框架 | 上游 |
|---|---|---|---|
| `rust-by-example-cn/` | 通过例子学 Rust | mdBook | [rust-lang-cn/rust-by-example-cn](https://github.com/rust-lang-cn/rust-by-example-cn) |
| `rust-course/` | Rust 语言圣经 | mdBook | [sunface/rust-course](https://github.com/sunface/rust-course) |
| `typescript-tutorial/` | TypeScript 入门教程 | Pagic (Deno) | [xcatliu/typescript-tutorial](https://github.com/xcatliu/typescript-tutorial) |

## 🛠 本地部署（离线可查）

### 前置依赖（一次性）

```bash
# mdBook —— 两本 Rust 书共用
cargo install mdbook

# Deno —— TypeScript 教程需要（macOS）
brew install deno
```

### Pagic（TypeScript 教程专用）

TypeScript 教程的构建脚本引用了 `../pagic/mod.ts`，所以需要在 `_raw/` 下多 clone 一份 Pagic：

```bash
cd _raw
git clone https://github.com/xcatliu/pagic.git
```

> 注意：Pagic 不是 submodule，只是一个本地构建依赖。

### 启动

```bash
# rust-by-example-cn → http://localhost:3000
cd _raw/rust-by-example-cn && mdbook serve

# rust-course → http://localhost:3000（不要同时起两个，端口冲突）
cd _raw/rust-course && mdbook serve --port 3001

# typescript-tutorial → Deno dev server
cd _raw/typescript-tutorial && npm start
```

## ⚠️ 离线前注意

第一次使用前需要网络：
1. `cargo install mdbook` 下载编译 mdBook
2. `brew install deno` 安装 Deno 运行时
3. `git clone https://github.com/xcatliu/pagic.git` 拉 Pagic（Deno 首次 `npm start` 还会下载依赖缓存）

装好之后，三本书都是**纯本地运行**，不依赖网络。
