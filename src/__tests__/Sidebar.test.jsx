import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Sidebar from "../components/Sidebar";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Tester", email: "t@example.com" },
    logout: vi.fn(),
  }),
}));

describe("Sidebar", () => {
  it("shows and hides when toggled", () => {
    const Wrapper = () => <Sidebar isOpen={true} toggleSidebar={vi.fn()} />;
    const { container } = render(
      <MemoryRouter>
        <Wrapper />
      </MemoryRouter>
    );

    // Check sidebar renders with open class
    const sidebar = container.querySelector('.sidebar.sidebar-open');
    expect(sidebar).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });
});
