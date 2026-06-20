/**
 * puerts struct 跨边界 GC 测试脚本。
 *
 * 验证：struct 里的裸 UObject* 失效后，TS 读它得到 undefined（不是 null、不崩）。
 * 对应笔记「Puerts结构体跨边界与所有权.md」追问 3 的「情况 B」。
 */
export function testStructUObjectGC(): void {
    // 1. 拿到 payload —— 🔴 全程不要碰 payload.Target！
    //    一碰就被 puerts SetJsTakeRef → UserObjectRetainer.Retain 保活（情况 A），
    //    而本测试要验证的正是「没碰 → 不保活 → 失效降级」（情况 B）。
    const payload = UE.UPuertsGCTestLib.MakeTestPayload();

    // 2. 让 Target 失效 + GC 清理（Target 没被 Retain，销毁后 Retainer 不持有野指针，安全）
    UE.UPuertsGCTestLib.DestroyTestTarget();
    UE.UPuertsGCTestLib.ForceGC();

    // 3. 等 GC 真正执行完（ForceGarbageCollection 是下一帧才跑；机器慢可调大）
    setTimeout(() => {
        const t = payload.Target;   // ← 此刻才第一次读

        // 跑之前先别看右边的预期，自己猜结果，跑完对照
        console.log("typeof t   :", typeof t);          // 预期: "undefined"
        console.log("t === null :", t === null);        // 预期: false  ← 关键反直觉点
        console.log("t == null  :", t == null);         // 预期: true
        console.log("t?.Hp      :", (t as any)?.Hp);    // 预期: undefined
    }, 200);
}
