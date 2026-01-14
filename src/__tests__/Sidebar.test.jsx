import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
    render(
      <MemoryRouter>
        <Wrapper />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("navigation", { name: /sidebar/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });
});
