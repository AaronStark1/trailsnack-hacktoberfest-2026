import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import UpdatePrompt, { SW_UPDATE_EVENT } from "../../src/components/layout/UpdatePrompt.tsx";

afterEach(() => {
  window.__trailsnackUpdateSW = undefined;
});

describe("UpdatePrompt (H5: reload must activate the waiting worker)", () => {
  it("calls updateSW(true) instead of location.reload", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    window.__trailsnackUpdateSW = update;
    render(<UpdatePrompt />);
    expect(screen.queryByRole("button", { name: /reload to update/i })).toBeNull();
    window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT));
    const btn = await screen.findByRole("button", { name: /reload to update/i });
    fireEvent.click(btn);
    expect(update).toHaveBeenCalledWith(true);
  });
});
