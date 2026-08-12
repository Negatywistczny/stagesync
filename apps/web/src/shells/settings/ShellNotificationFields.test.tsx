// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShellNotificationFields } from "./ShellNotificationFields.js";
import { requestNotificationPermission } from "@lib/client/pushNotifications.js";

vi.mock("@lib/client/pushNotifications.js", () => ({
  readPushEnabledPreference: vi.fn().mockReturnValue(false),
  getWebNotificationPermission: vi.fn().mockReturnValue("default"),
  requestNotificationPermission: vi.fn().mockResolvedValue("granted"),
  setPushEnabledPreference: vi.fn(),
  syncPushRegistration: vi.fn().mockResolvedValue(undefined),
}));

describe("ShellNotificationFields", () => {
  it("renders enable button and toggles state upon permission grant", async () => {
    render(<ShellNotificationFields />);

    const btn = screen.getByTestId("push-permission");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(requestNotificationPermission).toHaveBeenCalled();
    });
  });
});
