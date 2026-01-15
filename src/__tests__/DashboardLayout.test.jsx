import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import DashboardLayout from "../components/DashboardLayout";

vi.mock("../components/Sidebar", () => ({
  default: () => <div data-testid="sidebar" />,
}));

describe("DashboardLayout", () => {
  it("wraps children and renders sidebar", () => {
    render(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>
    );
    expect(screen.getByText("Child Content")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });
});
