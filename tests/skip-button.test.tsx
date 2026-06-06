import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const skipLesson = vi.fn();
const refresh = vi.fn();

vi.mock("@/app/actions/skip-lesson", () => ({
  skipLesson: (...args: unknown[]) => skipLesson(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/sounds", () => ({
  playTap: vi.fn(),
}));

import { SkipButton } from "@/components/dashboard/skip-button";

describe("SkipButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    skipLesson.mockResolvedValue(undefined);
  });

  it("renders the default label", () => {
    render(<SkipButton lessonId="lesson-1" />);
    expect(screen.getByRole("button", { name: "Skip this lesson" })).toBeInTheDocument();
  });

  it("calls skipLesson with the lesson id and refreshes", async () => {
    render(<SkipButton lessonId="lesson-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Skip this lesson" }));

    await waitFor(() => expect(skipLesson).toHaveBeenCalledWith("lesson-1"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows a loading label and disables the button while skipping", async () => {
    let resolve!: () => void;
    skipLesson.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    render(<SkipButton lessonId="lesson-1" />);
    const button = screen.getByRole("button", { name: "Skip this lesson" });
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText("Skipping...")).toBeInTheDocument());
    expect(screen.getByRole("button")).toBeDisabled();

    resolve();
    await waitFor(() =>
      expect(screen.getByText("Skip this lesson")).toBeInTheDocument()
    );
  });
});
