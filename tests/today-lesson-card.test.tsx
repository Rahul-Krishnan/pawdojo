import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/sounds", () => ({
  playTap: vi.fn(),
}));

import { TodayLessonCard } from "@/components/dashboard/today-lesson-card";

describe("TodayLessonCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the lesson title and skill name", () => {
    render(<TodayLessonCard lessonId="l1" title="Sit Basics" skillName="Sit" />);
    expect(screen.getByText("Sit Basics")).toBeInTheDocument();
    expect(screen.getByText("Sit")).toBeInTheDocument();
    expect(screen.getByText("Start Training →")).toBeInTheDocument();
  });

  it("links to the lesson route", () => {
    render(<TodayLessonCard lessonId="abc-123" title="Sit Basics" skillName="Sit" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/lesson/abc-123");
  });
});
