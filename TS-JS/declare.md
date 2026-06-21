# TypeScript declare

> `declare` 是 TS 和 JS 运行时的边界线：编译期存在类型信息，不生成任何 JavaScript 代码。
> 相关笔记：[[函数重载方案]]

---

## 0. 一句话理解

```ts
declare const VERSION: string;  // → 编译器: VERSION 是 string，按这个检查
                                 // → 运行时: 没有 const VERSION = ... 的代码
                                 //   你自己想办法让 VERSION 存在（注入、cdn、wasm...）
```

`declare` = **"我向编译器保证：这个东西是存在的、类型是这个。你按这个查就行，编译完不用管它。"**

> Rust 版的对应物：`extern "C" { fn foo(arg: i32); }`——告诉编译器有这么个函数、参数是什么，链接时再解决。

---

## 1. 三种 declare，三种场景

### 1.1 `declare class` / `declare function` / `declare const` — 给"运行时就有的东西"贴类型

JS 有实体，TS 只有类型壳：

```ts
// .d.ts 文件中（如 @types/lodash）
declare function debounce<T extends (...args: any[]) => any>(
    func: T, wait?: number
): T;

declare function throttle<T extends (...args: any[]) => any>(
    func: T, wait?: number
): T;
```

**用在**：`.d.ts` 为 JS 库写类型、Puerts C++ 类暴露给 TS。

```ts
// Puerts 中，C++ 的 FVector 由引擎注入到全局——TS 不用写实现
declare class FVector {
    X: number; Y: number; Z: number;
    static Dist(v1: FVector, v2: FVector): number;
    Normalize(): FVector;
}
// → 你不能 new FVector() 时生成 JS 代码，但编译器知道 FVector 有这些字段
```

### 1.2 `declare module` — 跨文件给已有模块追加类型

**在你的项目里出现**：`SubscriberExtension.ts` 第 39 行 ↓

```ts
// 原 System.ts 里只有一个 subscribe 实现
export class System {
    public subscribe(...args: any[]) { ... }
}

// 另一个文件：给 System 的接口追加类型签名
declare module "../framework/System" {
    export interface System {
        // 追加给编译器的声明——运行时不生成任何代码
        subscribe<TReturnType, T extends Action<TReturnType>>(
            actionCtor: Constructor<T>,
            callback: (action: T) => TReturnType,
            thisArg?: System,
        ): number;
    }
}
```

**效果**：TS 编译期把同一 `module`/`interface` 的声明**合并**。`System` 虽然是 class，但它隐式声明了一个同名 interface——`declare module` 就给这个 interface 加签长。

> 关键：`declare module` 是**文件级**，不是全局。所以不同订阅器文件可以各自 `declare module` 追加签名，互不干扰。

### 1.3 `declare global` — 给全局空间加类型

```ts
// Puerts 注入的全局对象
declare global {
    interface Window {
        __UE_CONTEXT__: any;
    }
    const __PURE_TS_DEBUG__: boolean;
}

// 现在任何地方都能用
console.log(window.__UE_CONTEXT__);
if (__PURE_TS_DEBUG__) { ... }
```

没有 `declare global`，TS 会觉得 `window.__xxx` 是野变量。

---

## 2. 编译效果

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

## 3. 三个关键边界

| 边界 | 说明 |
|------|------|
| `declare` vs 普通声明 | `declare` 不生成 JS；不加 `declare` 必须有实现体 |
| `declare module` vs `declare namespace` | `module` 用于外部模块（有 import/export 的），`namespace` 用于全局脚本 |
| `declare module 'xxx'` vs `declare module './xxx'` | `'xxx'` 是裸标识符（npm 包名），`'./xxx'` 是相对路径 |

---

## 4. 在你项目里的完整链路

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

## 5. 常见坑

| 坑 | 现象 | 原因 / 解决 |
|----|------|-----------|
| `declare module` 里定义的值没有初始化 | TS 报错 | `declare module` 里只能放类型、interface、declare 的内容，不能放有值的代码 |
| `declare module` 的文件没有在 tsconfig include 里 | 类型没合并进去 | 确认文件路径被 tsconfig 覆盖 |
| `declare` 的东西运行时 undefined | 运行时报错 | `declare` 只是告诉 TS"它存在"——如果运行时没注入，red 字的报错等着你 |
| 用了 `declare` 但 import 了同名模块 | 覆盖了原有类型而不是合并 | `declare module` 必须完全删掉原模块的名字或显式合并 interface |
