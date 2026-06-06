import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const logSession = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock("@/app/actions/log-session", () => ({
  logSession: (...args: unknown[]) => logSession(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh, back: vi.fn() }),
}));

vi.mock("@/lib/sounds", () => ({
  playTap: vi.fn(),
  playSuccess: vi.fn(),
  playXpEarned: vi.fn(),
  playBadgeUnlock: vi.fn(),
}));

import { SessionLogForm } from "@/components/lesson/session-log-form";

function renderForm(props: Partial<React.ComponentProps<typeof SessionLogForm>> = {}) {
  return render(
    <SessionLogForm
      lessonId="lesson-1"
      skillId="skill-1"
      xpReward={10}
      onClose={vi.fn()}
      {...props}
    />
  );
}

describe("SessionLogForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logSession.mockResolvedValue({ success: true, xpAwarded: 10, achievementsUnlocked: [] });
  });

  it("renders the rating, reps, duration controls and submit button", () => {
    renderForm({ xpReward: 15 });
    expect(screen.getByText("How did it go?")).toBeInTheDocument();
    expect(screen.getByText("Reps completed")).toBeInTheDocument();
    expect(screen.getByText("Session length")).toBeInTheDocument();
    expect(screen.getByText("I trained my dog! (+15 XP)")).toBeInTheDocument();
  });

  it("defaults to rating 3 ('OK') and updates the label when a rating is picked", () => {
    renderForm();
    expect(screen.getByText("OK")).toBeInTheDocument();
    fireEvent.click(screen.getByText("5"));
    expect(screen.getByText("Nailed it")).toBeInTheDocument();
  });

  it("submits the selected rating, reps and notes to the server action", async () => {
    renderForm();
    fireEvent.click(screen.getByText("4"));
    fireEvent.click(screen.getByText("8+"));
    fireEvent.change(screen.getByLabelText("Notes (optional)"), {
      target: { value: "great session" },
    });
    fireEvent.click(screen.getByRole("button", { name: /I trained my dog/ }));

    await waitFor(() => expect(logSession).toHaveBeenCalledTimes(1));
    expect(logSession).toHaveBeenCalledWith(
      expect.objectContaining({
        lessonId: "lesson-1",
        skillId: "skill-1",
        rating: 4,
        reps: 8,
        notes: "great session",
        isRetake: false,
      })
    );
  });

  it("passes isRetake through when set", async () => {
    renderForm({ isRetake: true });
    fireEvent.click(screen.getByRole("button", { name: /I trained my dog/ }));
    await waitFor(() => expect(logSession).toHaveBeenCalled());
    expect(logSession).toHaveBeenCalledWith(
      expect.objectContaining({ isRetake: true })
    );
  });

  it("shows a loading state and disables the submit button while submitting", async () => {
    let resolve!: (v: unknown) => void;
    logSession.mockReturnValue(new Promise((r) => (resolve = r)));
    renderForm();
    const button = screen.getByRole("button", { name: /I trained my dog/ });
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText("Logging...")).toBeInTheDocument());
    expect(button).toBeDisabled();

    resolve({ success: true, xpAwarded: 10, achievementsUnlocked: [] });
    await waitFor(() => expect(screen.getByText("Session logged!")).toBeInTheDocument());
  });

  it("renders a validation/error message returned by the server action and does not navigate", async () => {
    logSession.mockResolvedValue({ error: "Daily XP cap reached" });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /I trained my dog/ }));

    await waitFor(() =>
      expect(screen.getByText("Daily XP cap reached")).toBeInTheDocument()
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("renders the success confirmation with awarded XP", async () => {
    logSession.mockResolvedValue({ success: true, xpAwarded: 25, achievementsUnlocked: [] });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /I trained my dog/ }));

    await waitFor(() => expect(screen.getByText("Session logged!")).toBeInTheDocument());
    expect(screen.getByText("+25 XP")).toBeInTheDocument();
  });

  it("shows the achievement popup when achievements are unlocked", async () => {
    logSession.mockResolvedValue({
      success: true,
      xpAwarded: 10,
      achievementsUnlocked: ["First Steps"],
    });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /I trained my dog/ }));

    // The component reveals the popup ~1.2s after a successful submit.
    await waitFor(
      () => expect(screen.getByText("Award Earned!")).toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(screen.getByText("First Steps")).toBeInTheDocument();
    // With achievements unlocked it should NOT auto-navigate to the dashboard.
    expect(push).not.toHaveBeenCalled();
  });
});
