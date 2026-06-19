// #region 原型链

function A() {}
A.prototype.hello = function () {
  return "hello from A";
};

function B() {}
B.prototype = Object.create(A.prototype); // 关键：搭实例桥
B.prototype.bye = function () {
  return "bye from B";
};

const b = new B();

console.log("b.hello():", b.hello()); // 通过原型链 找到 A 的 hello()
console.log("b.bye():", b.bye()); // 在 B 原型链上找到 b bye()
console.log("b.__proto__ === B.prototype:", b.__proto__ === B.prototype); // true. new 函数会自动让 实例的 __proto__ 指向构造函数的 prototype
console.log(
  "b.__proto__.__proto__ === A.prototype:",
  b.__proto__.__proto__ === A.prototype,
); // true, 通过 B.prototype 的 __proto__ 指向 A.prototype 搭建了原型链
console.log("B.__proto__ === A:", B.__proto__ === A); // false! 手动模拟只能搭实例桥
console.log("自己的属性:", Object.keys(b));
console.log("原型链上的方法:", Object.keys(b.__proto__));

// #endregion

// #region 原型链继承属性
console.log("\n\n=========================");

function Dog(name) {
  this.name = name;
}
Dog.prototype.type = "犬科";
Dog.prototype.tags = []; // 引用类型——坑

const d1 = new Dog("旺财");
const d2 = new Dog("小黑");

// 读：原型链找 type
console.log("d1.type:", d1.type); // 犬科（从原型）
console.log("d2.type:", d2.type); // 犬科（从原型）

// 写：直接塞实例
d1.type = "柯基";
console.log("d1.type 写后:", d1.type); // 柯基（实例自己的）
console.log("d2.type 还在:", d2.type); // 犬科（还是原型的）
console.log("原型没变:", Dog.prototype.type); // 犬科

// 引用类型的坑
d1.tags.push("乖");
console.log("d1.tags:", d1.tags); // ['乖']
console.log("d2.tags:", d2.tags); // ['乖'] ← 也被改了！
console.log("是同一个数组?", d1.tags === d2.tags); // true

// #endregion
