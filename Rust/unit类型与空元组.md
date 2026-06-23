# Unit 类型与空元组 `()`

> 笔记范围：C++ `void` vs Rust `()` 的类型论差异、Rust 元组 vs C++ `std::tuple`、`()` 的妙用、`Vec<()>` 为什么能编译但没用、`;` → `()` 机制、`!` never type 简介。

## Rust 元组 vs C++ `std::tuple`

|  | C++ `std::tuple<A, B>` | Rust `(A, B)` |
|---|---|---|
| 身份 | **库类型**（模板），`<tuple>` 头文件 | **语言原生类型**，语法层面支持 |
| 内存 | 有间接层 / EBO 折叠等实现细节 | **栈上内联**，字段挨着放 |
| 空元组 | `std::tuple<>` — 合法类型，可构造 | `()` — unit type，恰好 1 个值 |
| 访问 | `std::get<0>(t)` 函数调用 | `t.0` 语法，编译期解析 |
| 单元素 | `std::tuple<int>(42)` 正常 | 必须加逗号 `(42,)`，否则是括号表达式 |

> C++ tuple 是后来打的补丁，Rust 的元组从语法到类型系统都是一等公民。

---

## `void` vs `()`：不是换了个名字，是换了一整套心智模型

### 一句话

| | C++ `void` | Rust `()` |
|---|---|---|
| 本质 | 表示「**不存在**值」 | 表示「**有一个值**，且它唯一」 |
| 声明变量 | ❌ `void x;` 编译报错 | ✅ `let x: () = ();` |
| 放容器 | ❌ `vector<void>` 非法 | ✅ `Vec<()>` 合法 |
| 放 `Option` | ❌ 需特化 | ✅ `Option<()>` 只有 `None` / `Some(())` |
| 模式匹配 | ❌ | ✅ `match x { () => ... }` |
| 运行时大小 | 无意义（不存在对象） | **0 字节**（Zero-Sized Type） |
| 函数指针 | `void(*)()` | `fn() -> ()` |

### `void` 是类型系统的「洞」

C++ 里 `void` 不是 regular type——不能构造、不能拷贝、不能析构。所以任何「对所有类型都成立的规则」，遇到 `void` 就得开特例：

```cpp
template<typename T> struct Wrapper { T value; };
Wrapper<void> w;          // ❌ 编译错误
std::vector<void> v;      // ❌ allocator 不知道分配多大
std::optional<void> opt;  // ❌ 要么禁止要么偏特化
```

`void` = 类型墙上的洞：编译器在这说「别按正常规则来，特殊处理」。

### `()` 不是洞，是「最简单的普通类型」

`()` 满足**所有**对普通类型成立的条件。它只有 1 个值（也叫 `()`），运行时大小为零——所以是 ZST 里最典型的一个。

它同时是空元组：`()` 和 `(A, B)` 是同一个语法族的成员。

关键洞察：**`void → ()` 不是改名，是把「不返回值」这个概念从类型系统的例外变成普通公民。** 所以 Rust 里没有「没有返回值」这回事——每个表达式都有类型、都有值。`()` 只是恰好不携带有意义数据。

---

## `()` 的实用场景

### 1. `Result<(), Error>` — 「我只关心成败」

```rust
fn write_config(path: &str, data: &[u8]) -> Result<(), io::Error> {
    std::fs::write(path, data)?; // 成功 → Ok(())
    Ok(())
}
```

语义比 C++ 的 `bool` 返回值精确：`Err(e)` 携带着**为什么失败**，`Ok(())` 表示成功且无需多言。

### 2. `HashMap<K, ()>` = `HashSet<K>`（字面意义上）

标准库里的 `HashSet<T>` 真的就是 `HashMap<T, ()>` 的包装。`()` 是 ZST，不占运行时内存：

```rust
// std::collections::HashSet 内部思路：
struct HashSet<T> {
    map: HashMap<T, ()>, // ← 不是类比，源码就这么写的
}
```

### 3. channel 只发信号，不传数据

```rust
let (tx, rx) = std::sync::mpsc::channel::<()>();
std::thread::spawn(move || {
    do_heavy_work();
    tx.send(()).unwrap(); // 「干完了」
});
rx.recv().unwrap(); // 等着，不关心内容
```

C++ 里得用无意义的 `int` 或者 `condition_variable` + `bool` 自己搭。

### 4. `()` 上 impl trait → 天然 no-op

```rust
trait Logger { fn log(&self, msg: &str); }

impl Logger for () {
    fn log(&self, _msg: &str) { /* 什么都不做 */ }
}
```

泛型代码里 `T = ()` → 编译期零成本不做事，`T = FileLogger` → 真实写日志。不需要 `#ifdef`。

---

## `Vec<()>`：能编译，但别写

```rust
let v: Vec<()> = vec![(), (), ()]; // len = 3，数据 = 0 字节
assert_eq!(v.len(), 3);            // ✅ 唯一有用的信息就是长度
```

但长度用一个 `usize` 就够了——不需要 Vec 的 24 字节头开销（ptr + len + cap）。**`Vec<()>` 能跑 ≠ 该跑。** 它只是 `()` 作为普通类型的自然推导——类型系统不该禁掉它。

同理：`.map(|x| { ... }).collect::<Vec<()>>()` 能编译但不该写，用 `.for_each()`。

---

## `;` → `()` 机制

`x + 1` 和 `x + 1;` 的区别本质上就是 **`i32` vs `()`**。

```rust
let a = { 42 };    // 块表达式，最后一行无分号 → 返回 42
let b = { 42; };   // 块表达式，最后一行有分号 → 返回 ()
```

- 分号把表达式的值**吞掉**，换成 `()`
- 这就是 Rust「表达式优先」设计的基石
- 也是为什么 `if/else` 两臂类型必须一致——`()` 也得参与类型检查，没有特殊待遇

### `return;` 的真相

`return;` 就是 `return ();` 的语法糖。从函数返回 `()` 类型时，可以省略最后一行或者写 `return;`。

---

## `!`（never type）：有 0 个值的类型

`()` 有 1 个值。`!` 有 **0 个值**——永远无法构造。

```rust
fn never_returns() -> ! {
    panic!("走了");
    // 编译器：这之后的代码不可达
}

// loop {} 的类型是 !
// std::process::exit() 的类型是 !
// todo!() / unimplemented!() 的类型也是 !
```

**`!` 可以满足任意类型要求**——因为编译器知道 `panic!()` 之后的代码永远不会走到。所以：

```rust
let x: String = panic!("走了"); // ✅ 编译通过
// 实际上 x 永远不会被赋值，类型检查是安全的
```

| | `()` | `!` |
|---|---|---|
| 值的数量 | 1 | 0 |
| 语义 | 完成了，没数据 | 永远不会完成 |
| 运行时大小 | 0 字节（ZST） | 0 字节（ZST） |
| `Option` | `Some(())` / `None` 都有意义 | `Option<!>` ≈ 必为 `None` |

---

## 相关笔记

- [[Rustlings 笔记]] — 练习过程中的 Rust 知识点
