import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const switchDog = vi.fn();
const refresh = vi.fn();

vi.mock("@/app/actions/switch-dog", () => ({
  switchDog: (...args: unknown[]) => switchDog(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/sounds", () => ({
  playTap: vi.fn(),
}));

import { DogSwitcher } from "@/components/dashboard/dog-switcher";

const dogs = [
  { id: "a", name: "Biscuit" },
  { id: "b", name: "Rex" },
];

describe("DogSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    switchDog.mockResolvedValue(undefined);
  });

  it("shows the active dog's name collapsed by default", () => {
    render(<DogSwitcher activeDogId="a" dogs={dogs} />);
    expect(screen.getByRole("heading", { name: "Biscuit" })).toBeInTheDocument();
    expect(screen.queryByText("+ Add Dog")).not.toBeInTheDocument();
  });

  it("opens the list of dogs when clicked", () => {
    render(<DogSwitcher activeDogId="a" dogs={dogs} />);
    fireEvent.click(screen.getByRole("heading", { name: "Biscuit" }));
    expect(screen.getByRole("button", { name: /Rex/ })).toBeInTheDocument();
    expect(screen.getByText("+ Add Dog")).toBeInTheDocument();
  });

  it("switches to a different dog and refreshes", async () => {
    render(<DogSwitcher activeDogId="a" dogs={dogs} />);
    fireEvent.click(screen.getByRole("heading", { name: "Biscuit" }));
    fireEvent.click(screen.getByRole("button", { name: /Rex/ }));

    await waitFor(() => expect(switchDog).toHaveBeenCalledWith("b"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("does not call switchDog when selecting the already-active dog", async () => {
    render(<DogSwitcher activeDogId="a" dogs={dogs} />);
    fireEvent.click(screen.getByRole("heading", { name: "Biscuit" }));
    // active dog appears in the dropdown list with a check mark
    fireEvent.click(screen.getByRole("button", { name: /Biscuit ✓/ }));

    // list closes without switching
    await waitFor(() => expect(screen.queryByText("+ Add Dog")).not.toBeInTheDocument());
    expect(switchDog).not.toHaveBeenCalled();
  });
});
