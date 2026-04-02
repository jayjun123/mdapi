"use client";

import type { ChipCategory } from "@/lib/board/boardTypes";
import { CHIP_CATEGORY_LABEL } from "@/lib/chip-registry/chipCategories";
import { ChipCard } from "@/components/chips/ChipCard";

export function ChipLibrarySection({
  titleCategory,
  chipTypes,
}: {
  titleCategory: ChipCategory;
  chipTypes: string[];
}) {
  if (chipTypes.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="px-1 text-[11px] font-semibold tracking-wide text-zinc-300">
        {CHIP_CATEGORY_LABEL[titleCategory]}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {chipTypes.map((t) => (
          <ChipCard key={t} chipType={t} />
        ))}
      </div>
    </section>
  );
}

