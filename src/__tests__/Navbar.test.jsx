import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "../components/Navbar";

// Mock AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Test User", email: "user@example.com" },
    logout: vi.fn(),
  }),
}));

describe("Navbar", () => {
  it("renders primary links and toggles mobile menu", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    // Desktop links exist in DOM
    expect(screen.getAllByText(/Dashboard/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Settings/i)[0]).toBeInTheDocument();

    // Toggle mobile menu
    const toggle = screen.getByRole("button", {
      name: /open menu|close menu/i,
    });
    fireEvent.click(toggle);
    expect(
      screen.getByRole("menu", { name: /mobile navigation/i })
    ).toBeInTheDocument();

    // Click again to close
    fireEvent.click(toggle);
    // menu removed
    expect(
      screen.queryByRole("menu", { name: /mobile navigation/i })
    ).not.toBeInTheDocument();
  });
});
