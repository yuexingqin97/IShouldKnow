# Puerts 与 UE C++ 通信模型

> 跨语言通信的本质：边界越少越安全，每多一次跳转就多一次 GC 风险 + 类型转换开销。

## 总览：六种 C++ → TS 调用方案

| # | 方案 | 需要开继承引擎类 | 跨语言跳转 | GC | 适用场景 |
|---|---|---|---|---|---|
| 1 | DYNAMIC_DELEGATE（UPROPERTY） | ❌ | 1 次 Broadcast | 手动 RemoveAll | 事件驱动 |
| 2a | toDelegate(owner, fn) | ❌ | 1 次 | owner GC 后自动释放 | 非 UClass 回调 |
| 2b | toManualReleaseDelegate(fn) | ❌ | 1 次 | ⚠️ 文档写"有内存泄露" | 谨慎使用 |
| 2c | toDelegate(obj, "FuncName") | ❌ | 1 次 | 同 2a | 按名绑定 UFunction |
| 3 | std::function | ❌ | 1 次 | C++ 析构自动清 | 纯 C++ 回调 |
| 4 | BlueprintFunctionLibrary 静态方法 | ✅ | 1 次 | 框架管 | 蓝图工具函数 |
| 5 | Override（class extends） | ✅ | 每虚函数 | 框架管 | 完整类替换 |
| 6 | Mixin | ❌ | 每调用 + 字节码解析 | 框架管 | 不改类体系挂回调 |

## C++ → TS：`std::function` 的导出机制

没有 `UFUNCTION` 宏的方法也能暴露给 TS——通过 Puerts 的 `DefineClass<>().Method()` 手动注册：

```cpp
// C++ 侧：纯原生类，不用 UFUNCTION
void MyClass::StdFunctionTest(std::function<int(int, int)> Func) {
    int Ret = Func(88, 99);
}

// 模块初始化时手动注册
PUERTS_NAMESPACE::DefineClass<MyClass>()
    .Method("StdFunctionTest", MakeFunction(&MyClass::StdFunctionTest))
    .Register();
```

```ts
// TS 侧直接传 lambda
obj.StdFunctionTest((x, y) => x + y);
```

`std::function` 的参数/返回值用 Puerts 的 `StdFunctionConverter` 自动转换——TS 传的箭头函数被包成 C++ lambda，C++ 调用时通过 V8 API 执行 JS 函数。UObject/AActor 等 UE 类型也可以传，走同一套 Converter。

### `std::function` 的 GC 坑

C++ 长期持有 `std::function` 时，捕获的闭包在 V8 里是 Persistent Handle → V8 不回收 → 闭包引用的 UObject 也无法被 UE GC。解除法：C++ 不需要时主动置 `nullptr`。

```cpp
void MyComponent::EndPlay() {
    Callback = nullptr;  // 释放 V8 Persistent Handle
}
```

## C++ → TS：`FJsObject` 直接读写

```cpp
void JsObjectTest(FJsObject Object) {
    auto P = Object.Get<int>("p");       // 读属性，不走 JS 函数调用
    Object.Set<const char*>("q", "john"); // 写属性
}
```

底层是 `v8::Object::Get/Set`（V8 属性表查找），比 `std::function` 回调少一层 JS 函数调用栈。适合 C++ 按需读取 TS 侧的配置/状态数据。

## TS → C++：调用 UFUNCTION 的三条路

TS 调 `actor.K2_GetActorLocation()` 时，Puerts 在**首次绑定**时解析 UFunction 反射信息一次，缓存为 `PropertyTranslator` 数组。后续调用分三条路径：

| 路径 | 机制 | 条件 | 开销 |
|---|---|---|---|
| **V8FastCall** | V8 CFunction API，C++ template 编译期生成 C 包装函数 | 参数全是 int/float/UObject*/enum | 最低 |
| **FastCall** | 手拼 FFrame → 调 `FNativeFuncPtr` | `FUNC_Native` + 非网络 + 非 Ubergraph | 中 |
| **SlowCall** | `Object->ProcessEvent()` | Blueprint 函数、网络 RPC | 高 |

绝大多数 UFUNCTION 走 FastCall——**不走 UE 反射的 ProcessEvent，直接调原生函数指针。** 网络 RPC 和蓝图函数才退回 SlowCall。

## 结构体拷贝：值类型过边界必拷贝

```cpp
// PropertyTranslator.cpp —— 结构体的 UEToJs：
if (!PassByPointer) {
    Ptr = FScriptStructWrapper::Alloc(Struct);  // new 堆内存
    StructProperty->CopySingleValue(Ptr, ValuePtr);  // 深拷贝
}
```

| | 值返回 / const& | 非 const 引用（`FVector& Out`） |
|---|---|---|
| 行为 | **new + 深拷贝** | 直接用 C++ 原始内存 |
| TS 修改 | 改拷贝，不影响 C++ | 直接写 C++ 内存 |
| 原因 | 防止 TS 持有野引用 | 调用者保证参数有效，但 TS 不能存下引用 |

UObject 不拷贝——只包一层存指针的 JS 代理对象。GC 负责生命周期。

## TS 侧 Vec3：计算锁在 V8 内

JS 没有值类型，每次 `FVector` 过边界都是一次 `new + CopySingleValue + V8 对象 + GC`。高频向量运算必须在 TS 侧做：

```ts
class Vec3 {
  constructor(public x=0, public y=0, public z=0) {}
  sub(v: Vec3) { return new Vec3(this.x-v.x, this.y-v.y, this.z-v.z); }
  dot(v: Vec3) { return this.x*v.x + this.y*v.y + this.z*v.z; }
  length()    { return Math.sqrt(this.dot(this)); }
  normalize() { const l = this.length(); return l > 0 ? this.scale(1/l) : new Vec3(); }
}

// 边界转换只用一次
function toVec3(fv: UE.Vector): Vec3 { return new Vec3(fv.X, fv.Y, fv.Z); }
function toFVector(v: Vec3): UE.Vector { return new UE.Vector(v.x, v.y, v.z); }
```

```
C++ FVector ──toVec3()──→ TS Vec3 ──所有运算锁在 V8 内──→ toFVector() ──→ C++ FVector
           一次跨语言                                      一次跨语言
```

## 字符串类型：FString / FName / FText

| | FString | FName | FText |
|---|---|---|---|
| 大小写 | 敏感 | **不敏感** | 敏感 |
| TS ← C++ | 拷贝 UTF-16 | NameTable 查 hash → FString → 拷贝 | `ToString()` → 丢本地化 key |
| TS → C++ | 拷贝到 FString | 传引用走 ArrayBuffer(sizeof(FName)) 零拷贝<br>普通走 intern 到 NameTable | `FromString()` → 非本地化 FText |
| 用途 | 临时字符串 | 标识符、key | 本地化显示文本 |

> FName 大小写不敏感但 Unicode 行为未定义。展示文本用 FText，内部 key 用 FName，临时字符串用 FString。

## Override vs Mixin：继承模式的区别

| | Override | Mixin |
|---|---|---|
| 实现 | `UJSGeneratedClass::Override` | `UJSGeneratedClass::Mixin` |
| C++ 原函数 | 改名 `__puerts_old__` 推到一边 | 保留，`NativeFunc` 换成 `execCallMixin` |
| 调用路径 | `execCallJS` → `Cast<UJSGeneratedFunction>` | `execCallMixin` → 读 Script 字节码找 UJSGeneratedFunction → 调 JS |
| 单次调用性能 | ✅ 更快（直接 Cast） | ❌ 多一步字节码解析 |
| 类体系 | 创建新 Blueprint 类 | 不改类体系，原地挂钩 |
| 适用 | 整个类用 TS 重写 | 给已有 C++ 对象挂零星回调 |

### Mixin 的完整实现链路

**TS 侧**（`uelazyload.js`）：

```js
function mixin(to, mixinClass, config) {
    // 1. 遍历 mixinClass.prototype，提取所有函数（跳过 constructor）
    let mixinMethods = Object.create(null);
    let names = Object.getOwnPropertyNames(mixinClass.prototype);
    for (var i = 0; i < names.length; ++i) {
        let name = names[i];
        let descriptor = Object.getOwnPropertyDescriptor(mixinClass.prototype, name);
        if (typeof descriptor.value === 'function' && name != "constructor") {
            mixinMethods[name] = mixinClass.prototype[name];
        }
    }

    // 2. 调用 C++ 侧 __tgjsMixin —— 换掉 UFUNCTION 的函数指针
    let cls = __tgjsMixin(to.StaticClass(), mixinMethods, ...);

    // 3. 把 mixin 函数挂到 JS 原型上（不是搭原型桥！是直接赋值）
    let jsCls = UEClassToJSClass(cls);
    Object.getOwnPropertyNames(mixinMethods).forEach(name => {
        if (!jsCls.prototype.hasOwnProperty(name)) {
            Object.defineProperty(jsCls.prototype, name,
                Object.getOwnPropertyDescriptor(mixinMethods, name));
        }
    });
    return jsCls;
}
```

**C++ 侧**（`JSGeneratedClass::Mixin` 第 179-260 行）：

```cpp
// 对每个要 mixin 的函数：
// 1. 保留原 UFUNCTION 的信息
Function->Original = Super;                    // 原函数引用
Function->OriginalFunc = Super->GetNativeFunc(); // 原函数指针
Function->OriginalFunctionFlags = Super->FunctionFlags;

// 2. 创建新的 UJSGeneratedFunction（名字加 __puerts_mixin__ 后缀）
UJSGeneratedFunction* Function = StaticDuplicateObject(Super, Class, "xxx__puerts_mixin__", ...);
Function->SetNativeFunc(&UJSGeneratedFunction::execCallMixin);

// 3. 🔴 换掉原 UFUNCTION 的函数指针
Super->FunctionFlags |= FUNC_Native;
Super->SetNativeFunc(&UJSGeneratedFunction::execCallMixin);
```

### Mixin 不走原型链继承

**Override 走原型链**：
```
TS 侧:  myActor.__proto__ → MyActor.prototype → UE.Actor.prototype → ...
C++ 侧: UTypeScriptGeneratedClass（新的 Blueprint 子类）
```

**Mixin 不走原型链**——函数被直接拷到 `jsCls.prototype` 上（`Object.defineProperty`），不设 `__proto__`：
```
TS 侧:  myActor.__proto__ → UE.Actor.prototype → ...
                          ↑
                     mixin 函数被直接 defineProperty 到这里
                     （Object.getOwnPropertyNames + defineProperty）

C++ 侧: 同一个类，UFUNCTION 的 Func 指针被换成 execCallMixin
```

> 核心差异：Override 创建新的 JS 原型桥 + 新的 C++ Blueprint 子类；Mixin 往已有 JS 原型上**拷函数** + 原地替换 C++ UFUNCTION 的函数指针。Mixin 不碰原型链。

### Override 的完整继承链路：从 `class extends` 到 `execCallJS`

**第 1 步：TS 侧 `class extends` → JS 原型桥**

```ts
class MyActor extends UE.Actor {
  ReceiveBeginPlay() { /* TS 实现 */ }
}
```

JS 引擎自动搭两座桥：
```
MyActor.prototype.__proto__ === UE.Actor.prototype   // 实例桥
MyActor.__proto__ === UE.Actor                       // 静态桥
```

`UE.Actor.prototype` 是 Puerts 为 C++ `AActor` 暴露的 JS 代理对象，上面挂着所有 `UFUNCTION` 的 stub。

**第 2 步：`makeUClass` → C++ 侧创建 `UTypeScriptGeneratedClass`**

`uelazyload.js` 的 `makeUClass`（220 行）提取 `MyActor.prototype` 上的所有方法 → 调 C++ `rawmakeclass`：

```js
function makeUClass(cls) {
    let proto = cls.prototype;
    let methods = Object.create(null);
    let names = Object.getOwnPropertyNames(proto);
    for (var i = 0; i < names.length; ++i) {
        let name = names[i];
        let descriptor = Object.getOwnPropertyDescriptor(proto, name);
        if (typeof descriptor.value === 'function' && name != "constructor") {
            if (name === 'Constructor') {
                ueConstructor = proto[name];       // TS 的 Constructor → UE 的构造
            } else {
                methods[name] = proto[name];       // 其他方法 → 待重定向
            }
        }
    }
    return rawmakeclass(ueConstructor, proto, `${cls.name}_C`, methods, cls.StaticClass());
}
```

C++ 侧 `UJSGeneratedClass::Create` 创建新的 `UTypeScriptGeneratedClass`，继承自 `AActor`：
- 持有 V8 `Constructor`（TS 构造函数）和 `Prototype`（TS 原型对象）
- `ClassConstructor = &StaticConstructor`

**第 3 步：UE 创建对象 → 调 C++ 父类构造 → `TsConstruct`**

```cpp
// TypeScriptGeneratedClass.cpp ObjectInitialize line 169
void UTypeScriptGeneratedClass::ObjectInitialize(const FObjectInitializer& ObjectInitializer) {
    // a. 先调 C++ 父类构造函数（分配 UObject 内存，初始化 UPROPERTY）
    GetSuperClass()->ClassConstructor(ObjectInitializer);

    // b. 调 TsConstruct → 在 V8 里创建 JS 对象 + 设原型链
    auto PinedDynamicInvoker = DynamicInvoker.Pin();
    PinedDynamicInvoker->TsConstruct(this, Object);
}
```

**第 4 步：`TsConstruct` → `JsConstruct` → 挂原型 + 调 TS 构造函数**

```cpp
// JsEnvImpl.cpp line 1978
void FJsEnvImpl::JsConstruct(Class, Object, Constructor, Prototype) {
    // a. 拿到 V8 里代表这个 C++ UObject 的 JS 代理对象
    auto JSObject = FindOrAdd(Isolate, Context, Class, Object);

    // b. 建立双向映射：C++ UObject ↔ V8 JS Object
    ObjectMap.Emplace(Object, v8::UniquePersistent<v8::Value>(Isolate, JSObject));

    // c. 🔴 设原型链：JSObject.__proto__ = MyActor.prototype
    JSObject->SetPrototype(Context, Prototype.Get(Isolate));

    // d. 🔴 调 TS 构造函数：new MyActor() 的构造函数体在 JS 代理对象上执行
    Constructor.Get(Isolate)->Call(Context, JSObject, 0, nullptr);
}
```

**第 5 步：函数重定向 → 保存原始函数指针，换 `execCallJS`**

```cpp
// ObjectInitialize 在构造后：
if (!RedirectedToTypeScript) {
    for (fields of UFunction in this class) {
        if (function is BlueprintEvent) {
            // 保存原生 C++ 函数指针 —— 可能以后恢复
            TempNativeFuncStorage.Add(FName, Function->GetNativeFunc());
            // 🔴 换成 execLazyLoadCallJS → 首次调用时再切到 execCallJS
            Function->SetNativeFunc(&UTypeScriptGeneratedClass::execLazyLoadCallJS);
        }
    }
    RedirectedToTypeScript = true;
}
```

**第 6 步：运行时 C++ 调 TS override**

```
C++ 侧:  Actor->ReceiveBeginPlay()
    → ProcessEvent 查到 UFUNCTION
    → UFunction::Func = execCallJS  (指针已被替换! )
    → DynamicInvoker->InvokeTsMethod(Context, Func, Stack, RESULT_PARAM)
    → V8: Context → ObjectMap 查表 → 找到 JS 代理对象
    → 沿 JS 原型链在 MyActor.prototype 上找到 ReceiveBeginPlay
    → 调用 TS 实现
```

### Override 完整运行时原型链

```
C++ AActor* (UObject 堆内存)
    ↕ ObjectMap (双向映射，GC 跟踪)
V8 JS Object (proxy, internal field 存 C++ 指针)
    │ __proto__
    ▼
MyActor.prototype          ← TS 类的方法：ReceiveBeginPlay()
    │ __proto__              (第 4 步通过 SetPrototype 挂上去的)
    ▼
UE.Actor.prototype          ← Puerts 自动暴露的 UFUNCTION stub
    │ __proto__
    ▼
UE.Object.prototype
    │ __proto__
    ▼
Object.prototype
    │ __proto__
    ▼
null
```

> 关键时间线：JS `extends` 搭原型桥 → `makeUClass` 提取方法传 C++ → C++ 创建 `UTypeScriptGeneratedClass` → UE 构造对象 → `JsConstruct` 设原型 + 调 TS 构造 → `ObjectInitialize` 换函数指针 → 运行时 C++ 调 `execCallJS` → 沿 JS 原型链找到 TS 方法执行。

## `blueprint.tojs`：运行时加载蓝图类必须做的绑定

```ts
const ucls = UE.Field.Load('/Game/MyBlueprint.MyBlueprint_C');
const jsClass = blueprint.tojs<typeof MyBlueprint_C>(ucls);
// 之后才能调 jsClass.StaticFunction() 或 new jsClass()
```

### 为什么加载蓝图后不能直接调函数

UE 的 `Field.Load` 只是拿到 C++ 侧的 `UClass*` 指针，包了一层 JS 代理对象。**但这个代理对象上没有 FunctionTemplate——UFUNCTION 没有被绑定为 JS 方法。** 没有 `tojs`，V8 看到的只是一个带有 `__proto__` 指向 `UClass.prototype` 的普通对象，上面没有 `StaticFunction()`、`Find()` 等方法。

### `tojs` 干了什么

`uelazyload.js` 第 266 行：`blueprint.tojs = UEClassToJSClass` —— 这是 C++ 暴露的绑定函数。

C++ 侧 `JsEnvImpl.cpp` 第 3228-3276 行 `UETypeToJsClass` → `GetJsClass`：

```cpp
v8::Local<v8::Function> FJsEnvImpl::GetJsClass(UStruct* InStruct, v8::Local<v8::Context> Context) {
    bool Existed;
    // 🔴 获取或创建 V8 FunctionTemplate（包含所有 UFUNCTION 绑定）
    auto Ret = GetTemplateInfoOfType(InStruct, Existed)->Template.Get(Isolate)->GetFunction(Context);

    if (!Existed) {  // 第一次创建
        auto Class = Cast<UClass>(InStruct);
        // 如果父类是 TypeScriptGeneratedClass，设原型桥
        if (Class && !Class->IsNative() && !InStruct->IsA<UTypeScriptGeneratedClass>()) {
            auto SuperClass = Cast<UTypeScriptGeneratedClass>(Class->GetSuperClass());
            if (SuperClass) {
                v8::Local<v8::Value> VProto;
                Ret->Get(Context, "prototype") → Proto;
                // 🔴 设蓝图 JS 原型的 __proto__ 指向 TS 父类的原型
                Proto->SetPrototype(Context, BindInfoMap[SuperClass].Prototype.Get(Isolate));
            }
        }
    }
    return Ret;
}
```

`GetTemplateInfoOfType` 这一步：

1. 遍历 `UClass` 上的所有 `UFUNCTION`
2. 对每个 UFUNCTION 创建 `FFunctionTranslator`（解析参数一次、缓存）
3. 创建 V8 `FunctionTemplate`，每个 UFUNCTION 绑定为 JS 方法
4. 生成 JS 构造函数 + `prototype`

### 为什么 C++ 原生类不需要 `tojs`

C++ 原生类（`AActor`、`UPrimitiveComponent` 等）在 Puerts 模块初始化时通过 `DefineClass<T>()` 或自动 UFUNCTION 扫描完成绑定——全局已经挂好。蓝图类是运行期动态加载的资产，不会走这个启动路径，必须手动 `tojs` 触发绑定。

```
C++ 原生类:
  Puerts 启动 → DefineClass<AActor>().Method(...).Register() → V8 全局已绑定
  TS: import * as UE from 'ue'; UE.Actor.Activate(...) → 直接用

蓝图类:
  UE.Field.Load() → 拿到 UClass* → 只是 C++ 指针，没有 JS 方法绑定
  blueprint.tojs(ucls) → GetTemplateInfoOfType → 创建 FunctionTemplate + 绑定 UFUNCTION
  → 返回 JS 构造函数 → 可以 new / 调静态方法
```

## 我的架构选择

```
高频虚函数（Tick、BeginPlay 类）:  不给 TS 重写，C++ 侧开 Delegate 让 TS 去绑定
零星事件回调:                      Delegate (UPROPERTY) 或 toDelegate(auto-release)
工具函数 / 纯 C++ 回调:            std::function + DefineClass<>().Method() 手动注册
配置数据读取:                      FJsObject::Get 或 一次调用缓存结果
向量运算:                          纯 TS Vec3，只在进出 C++ 时转一次
类主逻辑替换:                      Override（类型安全、生命周期框架管）
```
