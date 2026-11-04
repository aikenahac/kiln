// Channel branch-mapping JSON, adapted from expo/eas-cli (MIT)
// packages/eas-cli/src/channel/branch-mapping.ts and rollout/branch-mapping.ts;
// checked 2026-11-03. Kiln only edits the two shapes eas-cli edits: a single
// always-true branch, and a two-branch rollout (optionally constrained to a
// runtime version). Anything else is shown read-only.

type MappingObject = {
  clientKey: string;
  branchMappingOperator: string;
  operand: number | string | string[];
};
type MappingNode = "true" | MappingObject | [string, ...MappingNode[]];
type RawMapping = {
  version: number;
  data: { branchId: string; branchMappingLogic: MappingNode }[];
};

export type ChannelMapping =
  | { kind: "empty" }
  | { kind: "single"; branchId: string }
  | {
      kind: "rollout";
      rolledOutBranchId: string;
      defaultBranchId: string;
      percent: number;
      runtimeVersion?: string;
    }
  | { kind: "custom"; branchIds: string[] };

function isObject(node: MappingNode): node is MappingObject {
  return typeof node === "object" && !Array.isArray(node);
}

function isRolloutNode(node: MappingNode): node is MappingObject & { operand: number } {
  return (
    isObject(node) &&
    node.clientKey === "rolloutToken" &&
    node.branchMappingOperator === "hash_lt" &&
    typeof node.operand === "number"
  );
}

function isRuntimeNode(node: MappingNode): node is MappingObject & { operand: string } {
  return (
    isObject(node) &&
    node.clientKey === "runtimeVersion" &&
    node.branchMappingOperator === "==" &&
    typeof node.operand === "string"
  );
}

export function parseChannelMapping(json: string): ChannelMapping {
  let raw: RawMapping;
  try {
    raw = JSON.parse(json) as RawMapping;
  } catch {
    return { kind: "custom", branchIds: [] };
  }
  const data = Array.isArray(raw?.data) ? raw.data : [];
  if (data.length === 0) return { kind: "empty" };
  if (data.length === 1 && data[0]!.branchMappingLogic === "true")
    return { kind: "single", branchId: data[0]!.branchId };
  if (data.length === 2 && data[1]!.branchMappingLogic === "true") {
    const logic = data[0]!.branchMappingLogic;
    const base = {
      kind: "rollout" as const,
      rolledOutBranchId: data[0]!.branchId,
      defaultBranchId: data[1]!.branchId,
    };
    if (isRolloutNode(logic))
      return { ...base, percent: Math.round(logic.operand * 100) };
    if (Array.isArray(logic) && logic[0] === "and") {
      const nodes = logic.slice(1) as MappingNode[];
      const rollout = nodes.find(isRolloutNode);
      const runtime = nodes.find(isRuntimeNode);
      if (rollout && runtime && nodes.length === 2)
        return {
          ...base,
          percent: Math.round(rollout.operand * 100),
          runtimeVersion: runtime.operand,
        };
    }
  }
  return { kind: "custom", branchIds: data.map((entry) => entry.branchId) };
}

export function singleMapping(branchId: string): string {
  return JSON.stringify({
    version: 0,
    data: [{ branchId, branchMappingLogic: "true" }],
  });
}

export function rolloutMapping(input: {
  rolledOutBranchId: string;
  defaultBranchId: string;
  percent: number;
  runtimeVersion?: string;
}): string {
  const percent = Math.min(100, Math.max(0, Math.round(input.percent)));
  const rollout = {
    clientKey: "rolloutToken",
    branchMappingOperator: "hash_lt",
    operand: percent / 100,
  };
  return JSON.stringify({
    version: 0,
    data: [
      {
        branchId: input.rolledOutBranchId,
        branchMappingLogic: input.runtimeVersion
          ? [
              "and",
              {
                clientKey: "runtimeVersion",
                branchMappingOperator: "==",
                operand: input.runtimeVersion,
              },
              rollout,
            ]
          : rollout,
      },
      { branchId: input.defaultBranchId, branchMappingLogic: "true" },
    ],
  });
}

export type Segment = { branchId: string; name: string; percent: number };

export function mappingSegments(
  mapping: ChannelMapping,
  branchName: (id: string) => string,
): Segment[] {
  switch (mapping.kind) {
    case "empty":
    case "custom":
      return [];
    case "single":
      return [
        { branchId: mapping.branchId, name: branchName(mapping.branchId), percent: 100 },
      ];
    case "rollout":
      return [
        {
          branchId: mapping.rolledOutBranchId,
          name: branchName(mapping.rolledOutBranchId),
          percent: mapping.percent,
        },
        {
          branchId: mapping.defaultBranchId,
          name: branchName(mapping.defaultBranchId),
          percent: 100 - mapping.percent,
        },
      ];
  }
}
