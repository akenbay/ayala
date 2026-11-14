"use client";

import { useRouter } from "next/navigation";
import { SCENARIOS, type ScenarioId } from "@/lib/scenarios";
import { update, useStore } from "@/lib/storage";

/** Starts a story with Sam, or sends the parent to Plus when the story or plan day is locked. */
export function useStartPractice() {
  const router = useRouter();
  const unlocked = useStore()?.unlocked ?? false;
  return function start(id: ScenarioId, planDay: number | null = null, lesson: string | null = null) {
    const locked = (!SCENARIOS[id].free || (planDay !== null && planDay > 1)) && !unlocked;
    if (locked) {
      router.push("/pricing?from=" + id);
      return;
    }
    update((s) => {
      s.current = id;
      s.currentPlanDay = planDay;
      s.lesson = lesson;
    });
    router.push("/practice");
  };
}

/** Remembers that a lesson was opened, for Your path on the home page. */
export function markLessonRead(id: string) {
  update((s) => {
    s.lessonsRead = Array.from(new Set([...(s.lessonsRead ?? []), id]));
  });
}
