import { describe, expect, it } from "vitest";

import {
  mappingSegments,
  parseChannelMapping,
  rolloutMapping,
  singleMapping,
} from "@/lib/branch-mapping";
import { internalInstallUrl } from "@/lib/format";

describe("channel branch mapping", () => {
  it("round-trips a single branch", () => {
    expect(parseChannelMapping(singleMapping("b1"))).toEqual({ kind: "single", branchId: "b1" });
  });

  it("round-trips unconstrained and runtime-constrained rollouts", () => {
    expect(
      parseChannelMapping(rolloutMapping({ rolledOutBranchId: "new", defaultBranchId: "old", percent: 25 })),
    ).toEqual({ kind: "rollout", rolledOutBranchId: "new", defaultBranchId: "old", percent: 25 });
    expect(
      parseChannelMapping(
        rolloutMapping({ rolledOutBranchId: "new", defaultBranchId: "old", percent: 10, runtimeVersion: "1.0.0" }),
      ),
    ).toEqual({
      kind: "rollout",
      rolledOutBranchId: "new",
      defaultBranchId: "old",
      percent: 10,
      runtimeVersion: "1.0.0",
    });
  });

  it("writes the hash_lt operand as a fraction, like eas-cli", () => {
    const raw = JSON.parse(rolloutMapping({ rolledOutBranchId: "a", defaultBranchId: "b", percent: 37 }));
    expect(raw.data[0].branchMappingLogic).toEqual({
      clientKey: "rolloutToken",
      branchMappingOperator: "hash_lt",
      operand: 0.37,
    });
    expect(raw.data[1].branchMappingLogic).toBe("true");
  });

  it("treats unknown shapes as custom and bad JSON safely", () => {
    const custom = JSON.stringify({
      version: 0,
      data: [
        { branchId: "a", branchMappingLogic: { clientKey: "platform", branchMappingOperator: "==", operand: "ios" } },
        { branchId: "b", branchMappingLogic: "true" },
      ],
    });
    expect(parseChannelMapping(custom)).toEqual({ kind: "custom", branchIds: ["a", "b"] });
    expect(parseChannelMapping("{")).toEqual({ kind: "custom", branchIds: [] });
    expect(parseChannelMapping(JSON.stringify({ version: 0, data: [] }))).toEqual({ kind: "empty" });
  });

  it("splits segments to 100 percent", () => {
    const segments = mappingSegments(
      { kind: "rollout", rolledOutBranchId: "a", defaultBranchId: "b", percent: 30 },
      (id) => id.toUpperCase(),
    );
    expect(segments).toEqual([
      { branchId: "a", name: "A", percent: 30 },
      { branchId: "b", name: "B", percent: 70 },
    ]);
  });
});

describe("internal install links", () => {
  const base = { id: "build-1", app: { id: "app-1" }, isForIosSimulator: false };
  it("uses the itms-services manifest for internal iOS builds", () => {
    expect(internalInstallUrl({ ...base, platform: "IOS", distribution: "INTERNAL", artifacts: null })).toBe(
      "itms-services://?action=download-manifest;url=https://api.expo.dev/v2/projects/app-1/builds/build-1/manifest.plist",
    );
  });
  it("has no link for store, simulator, or AAB builds", () => {
    expect(internalInstallUrl({ ...base, platform: "IOS", distribution: "STORE", artifacts: null })).toBeUndefined();
    expect(
      internalInstallUrl({ ...base, platform: "IOS", distribution: "INTERNAL", isForIosSimulator: true, artifacts: null }),
    ).toBeUndefined();
    expect(
      internalInstallUrl({ ...base, platform: "ANDROID", distribution: "INTERNAL", artifacts: { buildUrl: "https://x/app.aab" } }),
    ).toBeUndefined();
    expect(
      internalInstallUrl({ ...base, platform: "ANDROID", distribution: "INTERNAL", artifacts: { buildUrl: "https://x/app.apk" } }),
    ).toBe("https://x/app.apk");
  });
});
