import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { TOOLS, type ToolId } from "../timelineToolsData.js";

interface Params {
  setTool: React.Dispatch<React.SetStateAction<ToolId>>;
  lastPointerRef: React.MutableRefObject<{ x: number; y: number }>;
  isMobilePreview: boolean;
  setTouchAlertOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useTimelineFloatingMenus({
  setTool,
  lastPointerRef,
  isMobilePreview,
  setTouchAlertOpen,
}: Params) {
  const eyeBtnRef = useRef<HTMLButtonElement>(null);
  const eyeMenuRef = useRef<HTMLDivElement>(null);
  const toolsVisBtnRef = useRef<HTMLButtonElement>(null);
  const toolsVisMenuRef = useRef<HTMLDivElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const wandMenuRef = useRef<HTMLDivElement>(null);

  const [eyeOpen, setEyeOpen] = useState(false);
  const [eyeMenuPos, setEyeMenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [toolsVisOpen, setToolsVisOpen] = useState(false);
  const [toolsVisMenuPos, setToolsVisMenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [toolMenu, setToolMenu] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [wandMenu, setWandMenu] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const wandMenuOpenRef = useRef(false);
  wandMenuOpenRef.current = Boolean(wandMenu);

  // --- Eye menu positioning & outside click --------------------------------

  useLayoutEffect(() => {
    if (!eyeOpen) {
      setEyeMenuPos(null);
      return;
    }

    function updateEyeMenuPos() {
      const btn = eyeBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setEyeMenuPos({ top: rect.bottom, left: rect.left });
    }

    updateEyeMenuPos();
    window.addEventListener("resize", updateEyeMenuPos);
    const scrollEl = document.querySelector("[data-canvas-scroll]");
    scrollEl?.addEventListener("scroll", updateEyeMenuPos, true);
    return () => {
      window.removeEventListener("resize", updateEyeMenuPos);
      scrollEl?.removeEventListener("scroll", updateEyeMenuPos, true);
    };
  }, [eyeOpen]);

  useEffect(() => {
    if (!eyeOpen) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (eyeBtnRef.current?.contains(target)) return;
      if (eyeMenuRef.current?.contains(target)) return;
      setEyeOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [eyeOpen]);

  // --- Tools visibility menu positioning & outside click -------------------

  useLayoutEffect(() => {
    if (!toolsVisOpen) {
      setToolsVisMenuPos(null);
      return;
    }

    function updateToolsVisMenuPos() {
      const btn = toolsVisBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setToolsVisMenuPos({ top: rect.bottom, left: rect.left });
    }

    updateToolsVisMenuPos();
    window.addEventListener("resize", updateToolsVisMenuPos);
    return () => {
      window.removeEventListener("resize", updateToolsVisMenuPos);
    };
  }, [toolsVisOpen]);

  useEffect(() => {
    if (!toolsVisOpen) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (toolsVisBtnRef.current?.contains(target)) return;
      if (toolsVisMenuRef.current?.contains(target)) return;
      setToolsVisOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [toolsVisOpen]);

  // --- Tool menu outside click --------------------------------------------

  useEffect(() => {
    if (!toolMenu) return;
    function onPointerDown(e: PointerEvent) {
      const el = toolMenuRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      setToolMenu(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [toolMenu]);

  // --- Wand menu outside click --------------------------------------------

  useEffect(() => {
    if (!wandMenu) return;
    function onPointerDown(e: PointerEvent) {
      const el = wandMenuRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      setWandMenu(null);
      setTool((t) => (t === "wand" ? "pointer" : t));
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [wandMenu, setTool]);

  // --- Tool menu opening & tool selection ---------------------------------

  const onTool = useCallback(
    (id: ToolId) => {
      if (isMobilePreview) {
        setTouchAlertOpen(true);
        return;
      }
      setToolMenu(null);
      if (id === "wand") {
        setTool("wand");
        const { x, y } = lastPointerRef.current;
        setWandMenu({
          left: Math.max(8, x),
          top: Math.max(8, y),
        });
        return;
      }
      setWandMenu(null);
      setTool(id);
    },
    [isMobilePreview, setTouchAlertOpen, setTool, lastPointerRef],
  );

  const openToolMenuAt = useCallback((clientX: number, clientY: number) => {
    const pad = 8;
    const approxW = 220;
    const approxH = TOOLS.length * 40 + 16;
    let left = clientX;
    let top = clientY;
    if (typeof window !== "undefined") {
      if (left + approxW > window.innerWidth - pad) {
        left = window.innerWidth - approxW - pad;
      }
      if (top + approxH > window.innerHeight - pad) {
        top = window.innerHeight - approxH - pad;
      }
    }
    setToolMenu({
      left: Math.max(pad, left),
      top: Math.max(pad, top),
    });
  }, []);

  return {
    eyeBtnRef,
    eyeMenuRef,
    toolsVisBtnRef,
    toolsVisMenuRef,
    toolMenuRef,
    wandMenuRef,
    eyeOpen,
    setEyeOpen,
    eyeMenuPos,
    setEyeMenuPos,
    toolsVisOpen,
    setToolsVisOpen,
    toolsVisMenuPos,
    setToolsVisMenuPos,
    toolMenu,
    setToolMenu,
    wandMenu,
    setWandMenu,
    wandMenuOpenRef,
    onTool,
    openToolMenuAt,
  };
}
