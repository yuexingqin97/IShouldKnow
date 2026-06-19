# JS Array 深度

> 普通 Array 不是 C++ 的 `std::vector`，TypedArray 才是。这篇把两个都拆开。

## 普通 Array 的内存模型：V8 尽力连续，但不保证

普通 Array 底层不是单一数据结构——V8 根据元素类型和密度动态切换存储模式。

### 四种元素模式

```js
const a = [1, 2, 3, 4, 5];
// 模式：PACKED_SMI_ELEMENTS —— 全是小整数 → 连续 C 数组，最快

a.push(6.5);
// 模式：PACKED_DOUBLE_ELEMENTS —— 有浮点 → 换成 double 数组，不可逆

a[1000] = 99;
// 模式：HOLEY_DOUBLE_ELEMENTS —— 有洞 → 哈希表 + 数组混合，慢

a[1001] = 'hello';
// 模式：HOLEY_ELEMENTS —— 有混合类型 + 有洞 → 最慢
```

```
PACKED_SMI (快)              HOLEY (慢)
┌───┬───┬───┬───┬───┐       ┌─┬─┬─┬─┬───┬───┬─┬─┐
│ 1 │ 2 │ 3 │ 4 │ 5 │       │1│2│3│4│...│...│99│  │
└───┴───┴───┴───┴───┘       └─┴─┴─┴─┴───┴───┴─┴─┘
   真正的 C 数组                哈希表 + 数组混合
```

### 降级不可逆

```
PACKED_SMI → PACKED_DOUBLE → HOLEY_DOUBLE → HOLEY
    ↑ 最快的           ↑ 浮点          ↑ 有洞         ↑ 最慢
   一旦降级，永远回不去。即使 delete arr[1000] 也回不去 PACKED。
```

### 对性能的影响

```bash
node -e "
const packed = Array.from({length: 1e6}, (_, i) => i);
const holey = Array.from({length: 1e6}, (_, i) => i);
holey[500000] = undefined; delete holey[500000]; // 制造空洞

console.time('packed forEach');
packed.forEach(x => x + 1);
console.timeEnd('packed forEach');

console.time('holey forEach');
holey.forEach(x => x + 1);
console.timeEnd('holey forEach');
"
// packed: ~4ms, holey: ~25ms —— 6 倍差距
```

> V8 优化技巧：不要 `delete arr[i]`（制造空洞），用 `arr[i] = undefined` 或 `splice`。不要混类型。不要用 `new Array(N)` 再逐个填——用 `[]` 再 push 或 `Array.from`。

## `extends Array` vs 组合

### 继承的问题

```js
class EntityList extends Array {
  getByTag(tag) { return this.filter(e => e.tags?.includes(tag)); }
}

// 问题 1：map/filter 返回来的是子类实例，但行为不可预测
const el = new EntityList({name: 'orc'});
el.map(x => x.name);  // → 新的 EntityList 实例（由 Symbol.species 控制）

// 问题 2：暴露了不该暴露的方法
el.splice(0, 1);  // 外部不应该能直接删元素

// 问题 3：类型判断模糊
Array.isArray(el);  // true —— 但你可能想区分"这是实体列表"
```

### 组合是正道

```js
class EntityList {
  #items = [];
  add(e) { this.#items.push(e); return this; }
  remove(e) { return this.#items.splice(this.#items.indexOf(e), 1)[0]; }
  get length() { return this.#items.length; }
  getByTag(tag) { return this.#items.filter(e => e.tags?.includes(tag)); }
  toArray() { return [...this.#items]; }      // 需要遍历时暴露只读视图
  forEach(fn) { this.#items.forEach(fn); }
}
```

> 跟你 C++ 同根：`class EntityManager` 里面放 `std::vector<Entity>`，不继承 `std::vector`。**组合暴露你需要的接口，继承暴露了整个基类。**

### 继承的确有用武之地：二进制 buffer

```js
// ✅ 继承 TypedArray —— 连续内存保证，固定类型
class IntBuffer extends Uint32Array {
  static fromBinary(blob) {
    return blob.arrayBuffer().then(buf => new this(buf));
  }
  getFlags(offset) { return this[offset]; }
  setFlag(offset, mask) { this[offset] |= mask; }
}
```

## TypedArray —— 真正的连续内存

### 一句话

```
普通 Array  →  可变长度、混合类型、V8 尽力连续但不保证
TypedArray  →  固定长度、单一类型、绝对连续内存
```

### 直观对比

```js
const arr = [1, 2, 3];
const typed = new Int32Array([1, 2, 3]);

arr.push(4);          // ✅ 动态扩展
typed.push;           // undefined —— TypedArray 没有 push！

arr.push('hello');    // ✅ 混合类型
typed[0] = 3.14;      // → 3 —— 自动截断为 Int32
typed[0] = 'hello';   // → 0 —— 非数字 → 0

arr[100] = 99;        // ✅ 可以（退化成 HOLEY）
typed[100] = 99;      // ❌ RangeError —— 越界直接报错
```

### 原型链不同

```
普通 Array:                     TypedArray:
  arr                             typed
   ↓                               ↓
  Array.prototype                 Int32Array.prototype (set, subarray)
  (map,filter,push,pop)           ↓
   ↓                              TypedArray.prototype (buffer, byteLength)
  Object.prototype                ↓
   ↓                              Object.prototype
  null                            ↓
                                  null
```

TypedArray **没有** `map`、`filter`、`push`、`pop`、`splice`——它是一个纯数据视图。方法在 `TypedArray.prototype` 上：`set`（批量写入）、`subarray`（切片视图）、`buffer`（底层 ArrayBuffer）、`byteLength`。

### 核心差异表

| | 普通 Array | TypedArray |
|---|---|---|
| 长度 | 动态 | **固定**——创建后不可变 |
| 类型 | 混合 | **单一类型**（Int8~64, Uint8~64, Float32/64, BigInt64） |
| 内存 | V8 尽力连续，有洞就退化 | **绝对连续**，一块 ArrayBuffer |
| 空洞 | 允许 | **不允许**——越界直接 RangeError |
| API | map/filter/push/splice... | set/subarray/buffer/byteLength |
| 继承谁 | `Array.prototype` | `Int32Array.prototype` → `TypedArray.prototype` |
| C++ 类比 | `std::vector<any>` | `int buf[N]` / `std::array<int, N>` |

### ArrayBuffer + TypedArray：同一块内存，多个视角

```js
const buf = new ArrayBuffer(8);       // 8 字节连续内存
const ints = new Int32Array(buf);     // 32 位整数视图
const bytes = new Uint8Array(buf);    // 字节视图——同一块内存

ints[0] = 0xDEADBEEF;
bytes[0];  // 0xEF  ← 同一块内存，不同视角
bytes[1];  // 0xBE
bytes[2];  // 0xAD
bytes[3];  // 0xDE
```

```
ArrayBuffer (8 字节连续内存)
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ EF │ BE │ AD │ DE │ 00 │ 00 │ 00 │ 00 │
└────┴────┴────┴────┴────┴────┴────┴────┘
  ↑                         ↑
Int32Array 视图           Uint8Array 视图
(4 字节整数: 0xDEADBEEF)  (单字节: EF, BE, AD, DE, ...)
```

| 类型 | 字节 | C++ 等价 |
|---|---|---|
| `Int8Array` / `Uint8Array` | 1 | `int8_t` / `uint8_t` |
| `Int16Array` / `Uint16Array` | 2 | `int16_t` / `uint16_t` |
| `Int32Array` / `Uint32Array` | 4 | `int32_t` / `uint32_t` |
| `BigInt64Array` / `BigUint64Array` | 8 | `int64_t` / `uint64_t` |
| `Float32Array` | 4 | `float` |
| `Float64Array` | 8 | `double` |

### 什么场景用哪个

| 场景 | 用 | 原因 |
|---|---|---|
| 游戏实体列表、UI 数据 | 普通 Array | 动态增删、map/filter |
| 网络包解析 | TypedArray | 字节对齐、零跨类型开销 |
| 顶点数据、纹理 buffer | TypedArray | 直接传 GPU |
| 技能配置表二进制加载 | TypedArray | 连续内存，偏移直读 |
| Puerts 接收 `TArray<uint8>` | TypedArray | 可能共享同一块内存（零拷贝） |

> Puerts 直接关联：C++ 传 `TArray<uint8>` 到 TS 侧，Puerts 可能用 `Uint8Array` 包装——底层共享同一块内存，零拷贝。网络包解析、技能配置表加载都应该走这条路，别用普通 Array 每个字节存一个 Number。
