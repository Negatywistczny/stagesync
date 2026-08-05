import { useEffect, useState } from "react";
import {
  DEVICE_DISPLAY_NAME_CHANGED_EVENT,
  getStoredDeviceDisplayName,
} from "./deviceNamePrefs.js";
import { useTransport } from "../../transport/useTransport.js";

/** Announce this device's stored display name + roles on the transport WS. */
export function useAnnounceDevicePresence(roles: readonly string[] = []): void {
  const { announcePresence } = useTransport();
  const [name, setName] = useState(() => getStoredDeviceDisplayName());
  const rolesKey = roles.join(",");

  useEffect(() => {
    const onChange = () => setName(getStoredDeviceDisplayName());
    window.addEventListener(DEVICE_DISPLAY_NAME_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(DEVICE_DISPLAY_NAME_CHANGED_EVENT, onChange);
    };
  }, []);

  useEffect(() => {
    if (!name) return;
    announcePresence({
      displayName: name,
      roles: rolesKey ? rolesKey.split(",") : [],
    });
  }, [announcePresence, name, rolesKey]);
}
