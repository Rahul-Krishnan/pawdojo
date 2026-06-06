import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const updateDog = vi.fn();
const refresh = vi.fn();

vi.mock("@/app/actions/update-profile", () => ({
  updateDog: (...args: unknown[]) => updateDog(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/sounds", () => ({
  playSuccess: vi.fn(),
}));

import { EditDogForm } from "@/components/profile/edit-dog-form";

function renderForm(props: Partial<React.ComponentProps<typeof EditDogForm>> = {}) {
  return render(
    <EditDogForm
      dogId="dog-1"
      initialName="Biscuit"
      initialBreed="Corgi"
      initialBirthday="2020-01-01"
      {...props}
    />
  );
}

describe("EditDogForm (profile)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateDog.mockResolvedValue({});
  });

  it("renders an Edit trigger initially and reveals the form on click", () => {
    renderForm();
    expect(screen.queryByDisplayValue("Biscuit")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByDisplayValue("Biscuit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Corgi")).toBeInTheDocument();
  });

  it("disables Save when the name is cleared", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeEnabled();

    fireEvent.change(screen.getByDisplayValue("Biscuit"), { target: { value: "  " } });
    expect(save).toBeDisabled();
  });

  it("saves edited values, refreshes the router and closes the form", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByDisplayValue("Biscuit"), { target: { value: "Rex" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateDog).toHaveBeenCalledTimes(1));
    expect(updateDog).toHaveBeenCalledWith(
      expect.objectContaining({ dogId: "dog-1", name: "Rex", breed: "Corgi" })
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    // form collapses back to the Edit trigger
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
    );
  });

  it("renders a validation error from the server action and keeps the form open", async () => {
    updateDog.mockResolvedValue({ error: "Dog name too long (max 50 characters)" });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(
        screen.getByText("Dog name too long (max 50 characters)")
      ).toBeInTheDocument()
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Biscuit")).toBeInTheDocument();
  });

  it("resets edits when Cancel is pressed", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByDisplayValue("Biscuit"), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // back to trigger; re-open shows original value, not the discarded edit
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByDisplayValue("Biscuit")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Changed")).not.toBeInTheDocument();
  });
});
