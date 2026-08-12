# Field / Input / Select / Textarea

Prymitywy formularza w `@stagesync/ui` — geometria wspólna z `Button`
(`min-height: var(--ss-touch-min)`, `--ss-*` only).

```tsx
import { Field, Input, Select, Textarea } from "@stagesync/ui";

<Field label="Nazwa" htmlFor="n" hint="opcjonalne">
  <Input id="n" />
</Field>

<Select aria-label="Sort">
  <option value="a">A</option>
</Select>

<Textarea aria-label="Notatka" />
```

Klasy CSS: `.ss-input`, `.ss-select`, `.ss-textarea`, `.ss-field`.
Zakaz lokalnego nadpisywania `padding` / `font-size` / `min-height` na tych
kontrolkach (wyjątek: `width` w layoutcie).
