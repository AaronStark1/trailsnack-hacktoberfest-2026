import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CameraView from "../../src/components/scan/CameraView.tsx";

const fakeStream = {
  getTracks: () => [],
  getVideoTracks: () => [{ getCapabilities: () => ({}) }],
};

function mockMediaDevices() {
  Object.defineProperty(window.navigator, "mediaDevices", {
    value: {
      enumerateDevices: async () => [{ kind: "videoinput" }],
      getUserMedia: async () => fakeStream,
    },
    configurable: true,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(window.navigator, "mediaDevices");
});

describe("CameraView iOS gesture fallback (H6)", () => {
  it("shows 'Tap to start the camera' when play() needs a gesture, even without an error", async () => {
    mockMediaDevices();
    // First play() rejects (iOS requires a user gesture); the tap retries fine.
    vi.spyOn(window.HTMLMediaElement.prototype, "play")
      .mockRejectedValueOnce(new Error("needs gesture"))
      .mockResolvedValue(undefined);
    render(<CameraView onFrame={() => undefined} />);
    // No error banner: the stream started, only autoplay was blocked.
    const tap = await screen.findByRole("button", { name: /tap to start the camera/i });
    expect(tap).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(tap);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /tap to start the camera/i })).toBeNull();
    });
  });
});
