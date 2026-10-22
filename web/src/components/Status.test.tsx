import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Status } from "./Status";

it("shows a generic message and retry for a non-ApiError", async () => {
  const onRetry = vi.fn();
  render(
    <Status isLoading={false} error={new TypeError("boom")} onRetry={onRetry}>
      child
    </Status>,
  );
  expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  expect(screen.queryByText("child")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalled();
});
