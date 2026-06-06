import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SkillRadar } from "@/components/practice/skill-radar";

describe("SkillRadar", () => {
  it("renders nothing with fewer than 3 skills", () => {
    const { container } = render(
      <SkillRadar skills={[{ name: "Sit", score: 0.8 }, { name: "Stay", score: 0.5 }]} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an svg with one label per skill", () => {
    const { container } = render(
      <SkillRadar
        skills={[
          { name: "Sit", score: 0.8 },
          { name: "Stay", score: 0.6 },
          { name: "Recall", score: 0.4 },
        ]}
      />
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Sit")).toBeInTheDocument();
    expect(screen.getByText("Stay")).toBeInTheDocument();
    expect(screen.getByText("Recall")).toBeInTheDocument();
  });

  it("abbreviates long skill names", () => {
    render(
      <SkillRadar
        skills={[
          { name: "Loose Leash Walking", score: 0.7 },
          { name: "Come (Recall)", score: 0.5 },
          { name: "Focus (Watch Me)", score: 0.9 },
        ]}
      />
    );
    expect(screen.getByText("Leash")).toBeInTheDocument();
    expect(screen.getByText("Recall")).toBeInTheDocument();
    expect(screen.getByText("Focus")).toBeInTheDocument();
  });
});
