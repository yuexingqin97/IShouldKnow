#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "PuertsGCTest.generated.h"

/**
 * 验证用 payload：一个裸 UObject*（验证降级）+ 一个普通值。
 *
 * 放置：复制到 UE 项目 Source/mkg/Public/Test/ 下编译，然后跑 puerts 的 d.ts 生成。
 */

// 测试用结构体。Target 是裸 UObject 指针 —— 验证它失效后 TS 读到 undefined（不是 null）。
USTRUCT()
struct FTestPayload
{
    GENERATED_BODY()

    UPROPERTY()
    UObject* Target = nullptr;

    UPROPERTY()
    float Hp = 0.f;
};

/**
 * puerts struct 跨边界 GC 测试辅助库。
 *
 * 目的：验证「struct 里的裸 UObject* 失效后，TS 读它得到 undefined（不是 null、不崩）」。
 * 依据：puerts FObjectPropertyTranslator::UEToJs 在 IsValidLowLevelFast 失败时返回 Undefined。
 */
UCLASS()
class MKG_API UPuertsGCTestLib : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()

public:
    /** 返回含「用完即弃 Target」的 payload。Target 藏在 struct 里，TS 全程不要直接读 .Target。 */
    UFUNCTION(BlueprintCallable, Category = "PuertsTest")
    static FTestPayload MakeTestPayload();

    /** 销毁上一次 MakeTestPayload 创建的 Target（ConditionalBeginDestroy 强制失效）。 */
    UFUNCTION(BlueprintCallable, Category = "PuertsTest")
    static void DestroyTestTarget();

    /** 请求一次全量 GC（异步，下一帧执行）。 */
    UFUNCTION(BlueprintCallable, Category = "PuertsTest")
    static void ForceGC();
};
