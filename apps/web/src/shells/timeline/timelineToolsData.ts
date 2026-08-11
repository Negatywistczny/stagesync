import type { FormaToolId } from "@lib/timeline/timelineGesture.js";
import {
  IconEraser,
  IconFade,
  IconGain,
  IconJoin,
  IconMarquee,
  IconMute,
  IconPencil,
  IconPointer,
  IconScissors,
  IconSolo,
  IconZoomIn,
} from "../components/icons.js";

export type ToolId = FormaToolId;

export type ToolDef = {
  id: ToolId;
  label: string;
  title: string;
  /** Second key after T opens the tools menu (Logic-style chord). */
  key: string | null;
  Icon: typeof IconPointer;
  /** Shown in toolbar + T menu (wand = Forma dock; Tap = Tekst dock). */
  inMenu?: boolean;
};

export const TOOLS: ToolDef[] = [
  {
    id: "pointer",
    label: "Wskaźnik",
    title: "Wskaźnik — zaznacz, przesuń, zmień długość",
    key: "t",
    Icon: IconPointer,
  },
  {
    id: "pencil",
    label: "Ołówek",
    title: "Ołówek — klik: 1 takt / marker; przeciągnij: zakres",
    key: "p",
    Icon: IconPencil,
  },
  {
    id: "eraser",
    label: "Gumka",
    title: "Gumka — usuń kliknięty element",
    key: "e",
    Icon: IconEraser,
  },
  {
    id: "scissors",
    label: "Nożyczki",
    title: "Nożyczki — podział klipu / podsekcja Formy / zmiana mapy",
    key: "i",
    Icon: IconScissors,
  },
  {
    id: "join",
    label: "Połącz",
    title: "Połącz — scal sąsiednie klipy / usuń granicę podsekcji",
    key: "j",
    Icon: IconJoin,
  },
  {
    id: "mute",
    label: "Mute",
    title: "Mute — przełącz wyciszenie klikniętego klipu audio",
    key: "m",
    Icon: IconMute,
  },
  {
    id: "solo",
    label: "Solo",
    title: "Solo — chwilowe solo ścieżki klipu audio przytrzymaniem LMB",
    key: "s",
    Icon: IconSolo,
  },
  {
    id: "fade",
    label: "Fade",
    title: "Fade — przeciągnij na krawędzi klipu audio: fade in/out",
    key: "a",
    Icon: IconFade,
  },
  {
    id: "gain",
    label: "Gain",
    title: "Gain — przeciągnij w pionie na klipie audio: poziom dB",
    key: "g",
    Icon: IconGain,
  },
  {
    id: "marquee",
    label: "Zaznaczanie",
    title: "Zaznaczanie — prostokąt na siatce",
    key: "r",
    Icon: IconMarquee,
  },
  {
    id: "zoom",
    label: "Zoom",
    title: "Zoom — przeciągnij prostokąt; klik tła = Fit",
    key: "y",
    Icon: IconZoomIn,
  },
];

export const TOOL_BY_KEY: Record<string, ToolDef> = Object.fromEntries(
  TOOLS.filter((t) => t.key).map((t) => [t.key!, t]),
);
