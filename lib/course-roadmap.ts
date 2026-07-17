import type { RoadmapTree } from "@/types/database";

export function flatModuleLabels(tree: RoadmapTree) {
  const labels: { phaseTitle: string; moduleTitle: string }[] = [];
  for (const phase of tree.phases) {
    for (const mod of phase.modules) {
      labels.push({ phaseTitle: phase.title, moduleTitle: mod.title });
    }
  }
  return labels;
}
