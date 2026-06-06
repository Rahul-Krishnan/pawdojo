import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const createDog = vi.fn();

vi.mock("@/app/actions/create-dog", () => ({
  createDog: (...args: unknown[]) => createDog(...args),
}));

import { DogForm } from "@/components/onboarding/dog-form";

describe("DogForm (onboarding)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createDog.mockResolvedValue({});
  });

  it("renders name (required), breed and birthday fields", () => {
    render(<DogForm />);
    expect(screen.getByLabelText(/Dog.s name/)).toBeRequired();
    expect(screen.getByLabelText(/Breed/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Birthday/)).toBeInTheDocument();
  });

  it("disables the submit button until a name is entered", () => {
    render(<DogForm />);
    const button = screen.getByRole("button", { name: "Start Training" });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Dog.s name/), { target: { value: "Biscuit" } });
    expect(button).toBeEnabled();
  });

  it("submits the entered values to createDog", async () => {
    render(<DogForm />);
    fireEvent.change(screen.getByLabelText(/Dog.s name/), { target: { value: "Biscuit" } });
    fireEvent.change(screen.getByLabelText(/Breed/), { target: { value: "Corgi" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Training" }));

    await waitFor(() => expect(createDog).toHaveBeenCalledTimes(1));
    expect(createDog).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Biscuit", breed: "Corgi" })
    );
  });

  it("sends null breed/birthday when those optional fields are empty", async () => {
    render(<DogForm />);
    fireEvent.change(screen.getByLabelText(/Dog.s name/), { target: { value: "Rex" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Training" }));

    await waitFor(() => expect(createDog).toHaveBeenCalled());
    expect(createDog).toHaveBeenCalledWith({ name: "Rex", breed: null, birthday: null });
  });

  it("renders a validation error returned by the server action", async () => {
    createDog.mockResolvedValue({ error: "Dog name is required" });
    render(<DogForm />);
    fireEvent.change(screen.getByLabelText(/Dog.s name/), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Training" }));

    await waitFor(() =>
      expect(screen.getByText("Dog name is required")).toBeInTheDocument()
    );
  });
});
