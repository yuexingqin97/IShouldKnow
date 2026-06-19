# TS 枚举编译成 JS 对象：踩坑指南

> 核心坑：数字枚举有反向映射，字符串枚举没有。遍历方式因此完全不同。

## 数字枚举：有反向映射

```ts
// TS 源码
enum Color { Red, Green, Blue }
```

编译成的 JS：

```js
var Color;
(function (Color) {
  Color[Color["Red"]   = 0] = "Red";
  Color[Color["Green"] = 1] = "Green";
  Color[Color["Blue"]  = 2] = "Blue";
})(Color || (Color = {}));

// 运行时对象：
// { '0': 'Red', '1': 'Green', '2': 'Blue', Red: 0, Green: 1, Blue: 2 }
```

### 反向映射是怎么来的

```js
Color["Red"] = 0      // 赋值 → 返回 0
Color[0] = "Red"      // 用返回值当 key，把名字存进去 ← 这就是反向映射
```

**数字枚举里 `Color[0]` 能拿到 `'Red'`**——因为编译后的 JS 同时写了 `key→value` 和 `value→key` 两组。

### 遍历数字枚举

```bash
node -e "
var Color;
(function (Color) {
  Color[Color['Red'] = 0] = 'Red';
  Color[Color['Green'] = 1] = 'Green';
  Color[Color['Blue'] = 2] = 'Blue';
})(Color || (Color = {}));

// ❌ 直接 Object.keys —— 数字 key 和名字 key 混在一起
console.log('all keys:', Object.keys(Color));
// → ['0', '1', '2', 'Red', 'Green', 'Blue']

// ✅ 只拿名字：过滤掉可以转成数字的 key
const names = Object.keys(Color).filter(k => isNaN(Number(k)));
console.log('names:', names);  // ['Red', 'Green', 'Blue']

// ✅ 只拿值：从名字映射
const values = names.map(n => Color[n]);
console.log('values:', values);  // [0, 1, 2]

// ✅ 值 → 名字（反向映射）
console.log(Color[1]);  // 'Green'
"
```

## 字符串枚举：没有反向映射

```ts
// TS 源码
enum Direction { Up = 'Up', Down = 'Down' }
```

编译成的 JS：

```js
var Direction;
(function (Direction) {
  Direction["Up"] = "Up";
  Direction["Down"] = "Down";
})(Direction || (Direction = {}));

// 运行时对象：
// { Up: 'Up', Down: 'Down' }
```

**没有反向映射。** 因为 `Direction["Up"] = "Up"` 返回 `"Up"`，再 `Direction["Up"] = "Up"` 就是覆盖自己——没意义。而且多个 key 可以有相同的字符串值（虽然不推荐），反向映射会冲突。

### 遍历字符串枚举

```bash
node -e "
var Direction;
(function (Direction) {
  Direction['Up'] = 'Up';
  Direction['Down'] = 'Down';
})(Direction || (Direction = {}));

// ✅ Object.keys 拿到所有名字 —— 因为没有数字 key 混入
console.log('names:', Object.keys(Direction));    // ['Up', 'Down']
console.log('values:', Object.values(Direction)); // ['Up', 'Down']

// ❌ 值 → 名字：没有反向映射，只能遍历找
const value = 'Down';
const name = Object.keys(Direction).find(k => Direction[k] === value);
console.log('value to name:', name);  // 'Down'
"
```

## 两种枚举的差异总表

| | 数字枚举 | 字符串枚举 |
|---|---|---|
| 反向映射（值 → 名） | ✅ 有，编译期自动生成 | ❌ 没有 |
| `Object.keys()` 含数字 key | 含（`'0', '1', '2'`） | 不含 |
| 遍历名和值 | 需要 `filter(isNaN)` 过滤数字 key | 直接 `Object.keys` / `Object.values` |
| 值 → 名 | `Color[1]` 直接取 | 必须 `Object.keys(Dir).find(k => Dir[k]===v)` |
| 运行时对象 | `{0:'Red', 1:'Green', Red:0, Green:1}` | `{Up:'Up', Down:'Down'}` |

## 常见坑

### 坑 1：`Object.keys(MyEnum)` 拿到六项而不是三项

```ts
enum Color { Red, Green, Blue }
Object.keys(Color);      // ['0', '1', '2', 'Red', 'Green', 'Blue'] —— 6 个！
Object.keys(Color).length / 2;  // 3 —— 数字枚举的"正确"名字数
```

### 坑 2：字符串枚举用 `Object.values` 拿不到数字

字符串枚举的 `Object.values(Direction)` 返回 `['Up', 'Down']`——名字和值一样。用 `Object.keys` 就行。

### 坑 3：`const enum` —— 运行时不存在，无法遍历

```ts
const enum Color { Red, Green, Blue }
// 编译后：Color 完全消失！
// const c = Color.Red → 编译为 → const c = 0
// Object.keys(Color) → ReferenceError: Color is not defined
```

`const enum` 值在编译期内联。不要用它做运行时遍历。

### 坑 4：异构枚举 —— 别用

```ts
enum Weird { No = 0, Yes = 'YES' }
// 编译产物：
// { '0': 'No', No: 0, Yes: 'YES' }
// 只有数字成员有反向映射，字符串成员没有。遍历逻辑会非常混乱。
```

## 推荐写法：写个工具函数

```ts
// 数字枚举：拿名字和值
function enumKeys<E>(e: any): string[] {
  return Object.keys(e).filter(k => isNaN(Number(k)));
}
function enumValues<E>(e: any): number[] {
  return enumKeys(e).map(k => e[k]);
}

// 所有枚举：值 → 名（兼容数字和字符串）
function enumName<T extends string>(e: any, value: T): T | undefined {
  // 数字枚举有反向映射，直接取
  if (e[value] !== undefined) return e[value];
  // 字符串枚举没有，遍历找
  return Object.keys(e).find(k => e[k] === value) as T | undefined;
}

// 使用
enum Color { Red, Green, Blue }
enumKeys(Color);           // ['Red', 'Green', 'Blue']
enumValues(Color);         // [0, 1, 2]
enumName(Color, 1);        // 'Green'
enumName(Color, '1' as any); // undefined —— 数字 key 的字符串不会误匹配
```

## 为什么编译产物是那个丑陋的 IIFE

最简单的写法本该是：

```js
var Direction = { Up: 'Up', Down: 'Down' };
```

但这一行满足不了 TS 的两个要求，所以不得不套上那个 IIFE。

### 需求 1：反向映射（数字枚举专属）

反向映射必须把**赋值当表达式用，拿到返回值**：

```js
// 一行完成两件事：
// a. Direction["Red"] = 0          正向映射
// b. Direction[0] = "Red"          反向映射（Direction["Red"]=0 的返回值是 0）

Direction[Direction["Red"] = 0] = "Red";

// 展开等价于：
Direction["Red"] = 0;   // 正向
Direction[0] = "Red";   // 反向 ← 拿赋值表达式的返回值当 key
```

**纯对象字面量做不到这步。** `{ Red: 0 }` 只写了单向映射。赋值表达式只能出现在**函数体**里——所以需要一个 IIFE 提供函数体。

### 需求 2：枚举合并（多个同名 enum）

```ts
// a.ts
enum Foo { A = 1 }

// b.ts
enum Foo { B = 2 }   // TS 允许把 B 合并进 Foo
```

编译后不能是两个独立的 `var Foo = ...`，必须是**同一个对象**往上追加：

```js
// a.ts 先生效 → Foo = { A: 1 }
// b.ts 必须拿到已存在的 Foo，往上追加
Foo["B"] = 2;
```

所以 `Direction || (Direction = {})` —— 已存在就复用，否则新建空对象。

### 两个需求叠加 → IIFE

```
IIFE 提供函数体 → 能用赋值表达式 → 能写反向映射
                →
IIFE 的参数 → Direction || (Direction = {}) → 枚举合并
```

```js
// TS: enum Color { Red, Green, Blue }
var Color;
(function (Color) {
  Color[Color["Red"]   = 0] = "Red";   // Color[0] = "Red"
  Color[Color["Green"] = 1] = "Green"; // Color[1] = "Green"
  Color[Color["Blue"]  = 2] = "Blue";  // Color[2] = "Blue"
})(Color || (Color = {}));
```

中间 `Color["Red"] = 0` 的返回值 `0` 立刻当 key 用——**赋值当表达式，对象字面量干不了。**

### 现代 TS 可以绕开

| 方案 | 编译产物 | 能遍历 | 反向映射 |
|---|---|---|---|
| `enum` | 那个丑陋 IIFE | ✅ | 数字有 |
| `const enum` | **零代码**（值内联） | ❌ | ❌ |
| `as const` | 干净 JS 对象 | ✅ | ❌ |

如果你不需要数字反向映射：

```ts
// 替换 enum Color { Red, Green, Blue }
const Color = { Red: 0, Green: 1, Blue: 2 } as const;
type Color = (typeof Color)[keyof typeof Color];  // 0 | 1 | 2
// 编译后 → const Color = { Red: 0, Green: 1, Blue: 2 }
```

> 那个 IIFE 丑，但它是在 JS 对象字面量的限制下，同时满足"赋值当表达式 + 反向映射 + 枚举合并"的最短写法。三个需求都不需要 → `as const` 干净了事。
