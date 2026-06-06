import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Per-table result queues the mocked Supabase client returns.
const tableResults: Record<string, { data: unknown[] }> = {
  lessons: { data: [] },
  training_sessions: { data: [] },
};

function makeQuery(table: string) {
  // A thenable query builder: every chained method returns the same object,
  // and awaiting/`.then()` resolves to the configured result for the table.
  const query: Record<string, unknown> = {};
  const passthrough = () => query;
  for (const method of ["select", "eq", "not", "order", "range"]) {
    query[method] = vi.fn(passthrough);
  }
  query.then = (resolve: (v: { data: unknown[] }) => unknown) =>
    Promise.resolve(tableResults[table]).then(resolve);
  return query;
}

const from = vi.fn((table: string) => makeQuery(table));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from }),
}));

vi.mock("@/lib/sounds", () => ({
  playTap: vi.fn(),
}));

import { SessionHistoryModal } from "@/components/progress/session-history-modal";

describe("SessionHistoryModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableResults.lessons = { data: [] };
    tableResults.training_sessions = { data: [] };
  });

  it("renders the title and a Done button", () => {
    render(<SessionHistoryModal dogId="dog-1" onClose={vi.fn()} />);
    expect(screen.getByText("Session History")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("calls onClose when Done is clicked", () => {
    const onClose = vi.fn();
    render(<SessionHistoryModal dogId="dog-1" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state when there are no sessions", async () => {
    tableResults.lessons = {
      data: [{ id: "l1", skill_id: "s1", title: "Sit Basics" }],
    };
    tableResults.training_sessions = { data: [] };

    render(<SessionHistoryModal dogId="dog-1" onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText("No sessions logged yet")).toBeInTheDocument()
    );
  });

  it("renders fetched sessions joined to their lesson titles", async () => {
    tableResults.lessons = {
      data: [{ id: "l1", skill_id: "s1", title: "Sit Basics" }],
    };
    tableResults.training_sessions = {
      data: [
        {
          id: "sess-1",
          skill_id: "s1",
          rating: 4,
          reps: 8,
          duration_min: 5,
          notes: "good boy",
          logged_at: "2026-01-01T10:00:00.000Z",
          skills: { name: "Sit" },
        },
      ],
    };

    render(<SessionHistoryModal dogId="dog-1" onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText("Sit Basics")).toBeInTheDocument()
    );
    expect(screen.getByText("good boy")).toBeInTheDocument();
    expect(screen.getByText(/8\+ reps/)).toBeInTheDocument();
  });
});
