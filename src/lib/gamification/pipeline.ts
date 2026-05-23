// Gamification pipeline: called after each session log.
// Steps 6-8 replace the stub handlers with real implementations.

export type SessionData = {
  userId: string;
  dogId: string;
  sessionId: string;
  lessonId: string | null;
  skillId: string | null;
  rating: number;
};

export type PipelineResult = {
  streakUpdated: boolean;
  xpAwarded: number;
  achievementsUnlocked: string[];
};

type PipelineHandler = (
  data: SessionData
) => Promise<Partial<PipelineResult>>;

// Pipeline handlers registered by Steps 6-8
const handlers: PipelineHandler[] = [];

export function registerHandler(handler: PipelineHandler) {
  handlers.push(handler);
}

export async function runGamificationPipeline(
  data: SessionData
): Promise<PipelineResult> {
  const result: PipelineResult = {
    streakUpdated: false,
    xpAwarded: 0,
    achievementsUnlocked: [],
  };

  for (const handler of handlers) {
    const partial = await handler(data);
    if (partial.streakUpdated) result.streakUpdated = true;
    if (partial.xpAwarded) result.xpAwarded += partial.xpAwarded;
    if (partial.achievementsUnlocked) {
      result.achievementsUnlocked.push(...partial.achievementsUnlocked);
    }
  }

  return result;
}
