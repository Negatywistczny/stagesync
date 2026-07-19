import { useContext } from "react";
import {
  TransportContext,
  type TransportContextValue,
} from "./transportContext.js";

export type { WsStatus, TransportContextValue } from "./transportContext.js";

export function useTransport(): TransportContextValue {
  const ctx = useContext(TransportContext);
  if (!ctx) {
    throw new Error("useTransport must be used within TransportProvider");
  }
  return ctx;
}
