import { useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { API_BASE } from "../api/client";
import { cars } from "../test/fixtures";
import { handlers } from "../test/handlers";
import { renderWithClient } from "../test/render";
import { server } from "../test/server";
import { CarPicker } from "./CarPicker";

const porsche = cars[1]!;

function setup(selected: { id: string; label: string }[] = []) {
  server.use(...handlers);
  const onAdd = vi.fn();
  const onRemove = vi.fn();
  renderWithClient(<CarPicker selected={selected} onAdd={onAdd} onRemove={onRemove} />);
  return { onAdd, onRemove, user: userEvent.setup() };
}

describe("CarPicker", () => {
  it("shows results after typing 2+ characters", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("combobox", { name: "Search cars" }), "al");
    expect(await screen.findByRole("option", { name: /155 2\.5 V6 TI '93/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "155 2.5 V6 TI '93 · Alfa Romeo · gr4" })).toBeInTheDocument();
  });

  it("does not search with 1 character", async () => {
    const requests: string[] = [];
    server.use(
      http.get(`${API_BASE}/api/v1/cars`, ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json({ items: [], page: 1, pageSize: 10, total: 0 });
      }),
    );
    const user = userEvent.setup();
    renderWithClient(<CarPicker selected={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "a");
    await new Promise((r) => setTimeout(r, 400));
    expect(requests).toHaveLength(0);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("debounces and only shows results for the latest text", async () => {
    const requests: string[] = [];
    server.use(
      http.get(`${API_BASE}/api/v1/cars`, ({ request }) => {
        const q = new URL(request.url).searchParams.get("q") ?? "";
        requests.push(q);
        return HttpResponse.json({ items: q === "963" ? [porsche] : [cars[0]], page: 1, pageSize: 10, total: 1 });
      }),
    );
    const user = userEvent.setup();
    renderWithClient(<CarPicker selected={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "963");
    expect(await screen.findByRole("option", { name: /963 '24/ })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 400));
    expect(requests).toEqual(["963"]);
    expect(screen.queryByRole("option", { name: /155/ })).not.toBeInTheDocument();
  });

  it("adds a car with Enter after ArrowDown", async () => {
    const { user, onAdd } = setup();
    await user.type(screen.getByRole("combobox"), "963");
    await screen.findByRole("option", { name: /963 '24/ });
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-activedescendant", screen.getByRole("option").id);
    await user.keyboard("{Enter}");
    expect(onAdd).toHaveBeenCalledWith(porsche);
  });

  it("ignores a car that is already selected", async () => {
    const { user, onAdd } = setup([{ id: "963-24", label: "963 '24" }]);
    await user.type(screen.getByRole("combobox"), "963");
    await screen.findByRole("option", { name: /963 '24/ });
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("removes a chip", async () => {
    const { user, onRemove } = setup([{ id: "963-24", label: "963 '24" }]);
    await user.click(screen.getByRole("button", { name: "Remove 963 '24" }));
    expect(onRemove).toHaveBeenCalledWith("963-24");
  });

  it("disables input at 4 cars", () => {
    setup(["a", "b", "c", "d"].map((id) => ({ id, label: id })));
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByText("Maximum 4 cars")).toBeInTheDocument();
  });

  it("Escape closes the listbox", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "al");
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });
});

describe("CarPicker behaviour", () => {
  it("hides the old results while the new text is still debouncing", async () => {
    const { user } = setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "al");
    await screen.findByRole("option", { name: /155/ });
    await user.type(input, "x");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("closes the listbox on blur", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "al");
    await screen.findByRole("listbox");
    await user.tab();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("moves focus off the disabled input when the 4th car is added", async () => {
    server.use(...handlers);
    const user = userEvent.setup();
    function Harness() {
      const [sel, setSel] = useState([
        { id: "a", label: "a" },
        { id: "b", label: "b" },
        { id: "c", label: "c" },
      ]);
      return (
        <CarPicker
          selected={sel}
          onAdd={(c) => setSel((s) => [...s, { id: c.id, label: c.name }])}
          onRemove={vi.fn()}
        />
      );
    }
    renderWithClient(<Harness />);
    await user.type(screen.getByRole("combobox"), "963");
    await screen.findByRole("option", { name: /963/ });
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove 963 '24" })).toHaveFocus();
  });

  it("returns focus to the input after removing a chip", async () => {
    server.use(...handlers);
    const user = userEvent.setup();
    function Harness() {
      const [sel, setSel] = useState([{ id: "963-24", label: "963 '24" }]);
      return <CarPicker selected={sel} onAdd={vi.fn()} onRemove={(id) => setSel((s) => s.filter((x) => x.id !== id))} />;
    }
    renderWithClient(<Harness />);
    await user.click(screen.getByRole("button", { name: "Remove 963 '24" }));
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("reopens the closed list with ArrowDown", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("combobox", { name: "Search cars" }), "963");
    await screen.findByRole("option", { name: /963/ });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.keyboard("{ArrowDown}");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });
});
