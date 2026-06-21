# TypeScript declare 与 .d.ts

> `declare` 是语法，`.d.ts` 是承载这个语法的文件格式。两者合在一起，给 JS 代码贴类型标签，不生成任何运行时代码。
> 相关笔记：[[函数重载方案]]

---

## 0. declare 一句话理解

```ts
declare const VERSION: string;  // → 编译器: VERSION 是 string，按这个检查
                                 // → 运行时: 没有 const VERSION = ... 的代码
                                 //   你自己想办法让 VERSION 存在（注入、cdn、wasm...）
```

`declare` = **"我向编译器保证：这个东西是存在的、类型是这个。你按这个查就行，编译完不用管它。"**

> Rust 对照：`extern "C" { fn foo(arg: i32); }`——告诉编译器有这么个函数、参数是什么，链接时再解决。

---

## 1. .d.ts 基础

### 和 .ts 的区别

| 文件 | 有实现吗 | 编译生成 JS | 用途 |
|------|---------|------------|------|
| `.ts` | ✅ | ✅ 生成 `.js` | 写逻辑 |
| `.d.ts` | ❌ 全是类型声明 | ❌ 不生成任何 JS | 给逻辑贴类型 |

```
utils.ts    →  tsc  →  utils.js   +  utils.d.ts（如果开了 declaration）
                          ↑ 实现      ↑ 类型壳，给别人 import 用
```

### .d.ts 两种形态：模块型 vs 全局型

**模块型（有 import/export）**：

```ts
// lodash.d.ts
export function debounce<T extends (...args: any[]) => any>(func: T, wait?: number): T;
export function throttle<T extends (...args: any[]) => any>(func: T, wait?: number): T;
```

调用方必须 `import { debounce } from 'lodash';`

**全局/脚本型（无 import/export）**：

```ts
// globals.d.ts
declare const __VERSION__: string;
declare function log(msg: string): void;
```

任何文件都可以直接用 `__VERSION__`、`log()`，**不需要 import**。

> ⚠️ 文件中只要有一行 `import` 或 `export`，TS 就认为它是模块——里面的声明不污染全局。

### .d.ts 的三种来源

```
┌── 手写
│   declare class Xxx { ... }
│   → 给 JS 库 / C++ 桥接写类型
│
├── tsc --declaration 自动生成
│   tsconfig { "declaration": true }
│   → 从 .ts 编译出 .d.ts + .js
│   → npm 发包时暴露类型
│
└── @types/* 社区贡献
    npm i @types/lodash
    → 社区给别人写的 JS 库配的类型包
```

### 你打交道的地方

| 场景 | 例子 |
|------|------|
| `npm i @types/lodash` | 给 lodash JS 实现配的 `.d.ts` |
| Puerts `ue.d.ts` | C++ 注入类的类型声明 |
| tsconfig `"declaration": true` | 你自己 TS 编译时**顺带生成** `.d.ts` |
| VS Code 的 JS 类型提示 | 背后也是 `.d.ts` 在工作 |

---

## 2. 三种 declare 场景

### 2.1 `declare class` / `declare function` / `declare const` — 给运行时就有的东西贴类型

```ts
// .d.ts 文件中（如 @types/lodash）
declare function debounce<T extends (...args: any[]) => any>(
    func: T, wait?: number
): T;
```

**Puerts 场景**：C++ 的 FVector 由引擎注入到全局——TS 不用写实现：

```ts
declare class FVector {
    X: number; Y: number; Z: number;
    static Dist(v1: FVector, v2: FVector): number;
    Normalize(): FVector;
}
```

有了这个声明，你才能写 `new FVector()`——但运行时 `new FVector()` 根本不是 JS 的 `new`，Puerts 把它桥接到了 C++ 的构造函数。**`declare` 只管编译期的类型安全。**

### 2.2 `declare module` — 跨文件给已有模块追加类型

**在你的项目里**：`SubscriberExtension.ts` ↓

```ts
// 原 System.ts 里只有一个 subscribe 实现
export class System {
    public subscribe(...args: any[]) { ... }
}

// 另一个文件：给 System 的接口追加类型签名
declare module "../framework/System" {
    export interface System {
        subscribe<TReturnType, T extends Action<TReturnType>>(
            actionCtor: Constructor<T>,
            callback: (action: T) => TReturnType,
            thisArg?: System,
        ): number;
    }
}
```

**效果**：TS 编译期把同一 `module`/`interface` 的声明**合并**。`System` 虽然是 class，但它隐式声明了一个同名 interface——`declare module` 就给这个 interface 加签名。

> 关键：`declare module` 是**文件级**，不是全局。所以不同订阅器文件可以各自 `declare module` 追加签名，互不干扰。

### 2.3 `declare global` — 给全局空间加类型

```ts
// Puerts 注入的全局对象
declare global {
    interface Window {
        __UE_CONTEXT__: any;
    }
    const __PURE_TS_DEBUG__: boolean;
}

console.log(window.__UE_CONTEXT__);   // 编译通过
```

---

## 3. 编译效果

```ts
// 源代码
declare const API_URL: string;
declare class Logger {
    static log(msg: string): void;
}

// = 编译后 =
// ..
// 什么都没有。declare 过的代码在 JS 里不生成任何东西
```

---

## 4. 三种 declare 对照

| | 格式 | 干什么 | 什么时候用 |
|------|------|------|------|
| **值声明** | `declare class / function / const / var` | 给运行时就有的东西贴类型 | `.d.ts` 文件、Puerts C++ 桥接 |
| **模块扩展** | `declare module 'xxx'` | 给已有模块/接口追加类型 | 你项目里的 subscribe 重载——每个订阅器独立给 `System` 加签名 |
| **全局扩展** | `declare global { }` | 给全局命名空间加类型 | `window.__xxx`、`global.__xxx` |

---

## 5. 关键边界

| 边界 | 说明 |
|------|------|
| `declare` vs 普通声明 | `declare` 不生成 JS；不加 `declare` 必须有实现体 |
| `declare module` vs `declare namespace` | `module` 用于外部模块（有 import/export 的），`namespace` 用于全局脚本 |
| `declare module 'xxx'` vs `declare module './xxx'` | `'xxx'` 是裸标识符（npm 包名），`'./xxx'` 是相对路径 |
| `.d.ts` 模块型 vs 全局型 | 有 `import/export` 的那一行决定是否污染全局 |

---

## 6. 在你项目里的完整链路

你项目中 `subscribe` 的完整流程：

```
1. 各 Subscriber 文件里 declare module "../framework/System"
   → 编译期：TS 合并所有 declare module → System 接口有所有 subscribe 的重载签名
   → IDE 补全提示、参数类型检查、返回值推导全都有

2. System.ts 里 public subscribe(...args: any[]) 
   → 运行时唯一的实现体，直接透传给 SubscribeHelper

3. SubscribeHelper.getSubscriber(...args)
   → 遍历所有 subscriber，每个用自己的 canProcess(args) 判断是否认领
   → 不拼字符串、不查表，纯类型判断
```

```
编译期                                                   运行时
─────────────────────────────────────────────────      ─────────────
declare module (Action)  ┐
declare module (StoreAct) ├─ 合并 System 接口重载 ──→ 类型检查通过
declare module (Event)   ┘                              ↓
                                                    System.subscribe(...args)
                                                    → SubscribeHelper
                                                    → canProcess 链
                                                    → 找到匹配的 subscriber
```

---

## 7. 常见坑

| 坑 | 现象 | 原因 / 解决 |
|----|------|-----------|
| `declare module` 里定义的值没有初始化 | TS 报错 | `declare module` 里只能放类型、interface、declare 的内容，不能放有值的代码 |
| `declare module` 的文件没有在 tsconfig include 里 | 类型没合并进去 | 确认文件路径被 tsconfig 覆盖 |
| `declare` 的东西运行时 undefined | 运行时报错 | `declare` 只是告诉 TS"它存在"——如果运行时没注入，red 字的报错等着你 |
| `.d.ts` 里有 `import`，但想用全局类型 | 全局类型收不到 | 用 `declare global { }` 包住全局内容，模块文件也能写全局声明 |
| tsconfig 没覆盖 `.d.ts` | 类型不生效 | 确认文件路径在 `include` 里 |
