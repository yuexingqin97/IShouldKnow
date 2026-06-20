#include "PuertsGCTest.h"
#include "Engine/Engine.h"
#include "UObject/UObjectGlobals.h"

namespace
{
    // 弱引用：不影响 GC/销毁，只是让 DestroyTestTarget 能找回上一次创建的 Target。
    TWeakObjectPtr<UObject> GTestTarget;
}

FTestPayload UPuertsGCTestLib::MakeTestPayload()
{
    // NewObject 挂 TransientPackage → 被 root 持有，正常情况下永不被 GC；
    // 所以测试里用 ConditionalBeginDestroy 主动让它失效，而不是依赖自然 GC。
    UObject* T = NewObject<UObject>(GetTransientPackage(), TEXT("TestTarget"));
    GTestTarget = T;

    FTestPayload P;
    P.Target = T;
    P.Hp = 42.f;
    return P;   // puerts 深拷贝：Target 指针值浅拷贝进 struct 内存；TS 不读就不 Retain
}

void UPuertsGCTestLib::DestroyTestTarget()
{
    if (UObject* T = GTestTarget.Get())
    {
        T->ConditionalBeginDestroy();   // 强制失效：标记 pending kill / unreachable
    }
    GTestTarget.Reset();
}

void UPuertsGCTestLib::ForceGC()
{
    if (GEngine)
    {
        GEngine->ForceGarbageCollection(true);
    }
}
