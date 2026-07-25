# SegmentedControl

Wyłączna grupa `Button` (`selected` / `aria-pressed`) w `@stagesync/ui`.

```tsx
import { SegmentedControl } from "@stagesync/ui";

<SegmentedControl
  aria-label="Tryb"
  value={mode}
  onChange={setMode}
  options={[
    { value: "mono", label: "M" },
    { value: "stereo", label: "ST" },
  ]}
/>
```

Używane m.in. w Mixer channel mode. Layout wrappera może być lokalny
(siatka 2 kolumn), bez własnych `<button>` poza `Button`.
