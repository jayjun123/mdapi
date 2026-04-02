"use client";

import type { NodeProps } from "reactflow";
import type { ChipNodeData } from "@/store/useBoardStore";
import { BaseChip } from "@/components/chips/BaseChip";

export function ChipNode(props: NodeProps<ChipNodeData>) {
  return <BaseChip chipId={props.data.chipId} />;
}

