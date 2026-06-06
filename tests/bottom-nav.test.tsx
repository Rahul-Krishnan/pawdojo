import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const pathname = { value: "/dashboard" };

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

vi.mock("@/lib/sounds", () => ({
  playTap: vi.fn(),
}));

import { BottomNav } from "@/components/layout/bottom-nav";

describe("BottomNav", () => {
  beforeEach(() => {
    pathname.value = "/dashboard";
  });

  it("renders all three navigation tabs", () => {
    render(<BottomNav />);
    expect(screen.getByLabelText("Home")).toBeInTheDocument();
    expect(screen.getByLabelText("Progress")).toBeInTheDocument();
    expect(screen.getByLabelText("Profile")).toBeInTheDocument();
  });

  it("marks the active tab matching the current pathname", () => {
    pathname.value = "/progress";
    render(<BottomNav />);
    expect(screen.getByLabelText("Progress")).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("Home")).not.toHaveAttribute("aria-current");
  });

  it("links each tab to its route", () => {
    render(<BottomNav />);
    expect(screen.getByLabelText("Home")).toHaveAttribute("href", "/dashboard");
    expect(screen.getByLabelText("Progress")).toHaveAttribute("href", "/progress");
    expect(screen.getByLabelText("Profile")).toHaveAttribute("href", "/profile");
  });
});
