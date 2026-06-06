import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest does not auto-run Testing Library cleanup unless `globals: true`.
// Run it explicitly so rendered components are unmounted between tests.
afterEach(() => {
  cleanup();
});
