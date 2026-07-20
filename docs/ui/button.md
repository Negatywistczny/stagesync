# Button (`@stagesync/ui`)

Kanoniczny przycisk StageSync. Źródło:
[`packages/ui/src/button.tsx`](../../packages/ui/src/button.tsx),
[`button.css`](../../packages/ui/src/button.css).

Zamknięty zbiór stanów — konstytucja; **nie** twórz `Button2` ani lokalnych
przycisków CSS w shellach.

## Props

| Prop | Typ | Opis |
|------|-----|------|
| `variant` | `"primary"` \| `"secondary"` \| `"ghost"` | Hierarchia wizualna (domyślnie `primary`) |
| `loading` | `boolean` | Spinner + blokada interakcji |
| `selected` | `boolean` | Toggle; ustawia `aria-pressed` |
| `iconOnly` | `boolean` | Kwadrat 36×36 (`ss-btn--icon`) |
| `disabled` | `boolean` | Natywna blokada |
| `className` | `string` | Dodatkowe klasy |
| … | atrybuty `<button>` | `type`, `onClick`, itd. (bez `children` w Omit) |

## Stany (zamknięty zbiór)

Kolejność jak w komponencie: default → hover → focus → active → selected → loading → disabled.

| Stan | Zachowanie | A11y / kursor |
|------|------------|---------------|
| **default** | Gotowy do interakcji; wariant `primary` / `secondary` / `ghost` | kursor `pointer` |
| **hover** | Tylko `@media (hover: hover)` — brak sticky hover na touch/PWA; tło wariantu | bez zmiany a11y |
| **focus** | `focus-visible`: outline 2px `focus-ring`, offset 2px; samo `:focus` bez ringa | klawiatura / AT |
| **active** | `:active:not(:disabled)` — kolor pressed wariantu | — |
| **selected** | prop `selected` → `ss-btn--selected` | **`aria-pressed="true\|false"`** |
| **loading** | spinner + `ss-btn--loading`; `disabled={true}` — pełna blokada tap/click | **`aria-busy="true"`**, **`aria-disabled`**; kursor **`wait`** |
| **disabled** | style disabled-bg/text; brak hover/active | **`aria-disabled`**; kursor **`not-allowed`**; native `disabled` |

## Blokada interakcji

```ts
const isDisabled = Boolean(disabled || loading);
```

Przy `loading` lub `disabled` przycisk dostaje native `disabled` oraz
`aria-disabled` — **operator na scenie / w PWA nie może odpalić akcji ponownie**
(anti double-submit).

## PWA / touch

- Hover **nie** jest jedynym sygnałem interaktywności (krytyczne akcje zawsze widoczne).
- Stany `:hover` tylko w `@media (hover: hover)` — brak „wiszącego” hover po tapnięciu.
- `iconOnly`: hit target desktop **36×36** px (`padding` + width/height); Client PWA celuje w ≥44 px gdy osobna kontrolka touch.
- Gęstość: [ui-density.mdc](../../.cursor/rules/ui-density.mdc).

## Kiedy nie używać

- Nie duplikuj stylów przycisku w `*.module.css` shelli.
- Nie dodawaj wariantów poza `primary` / `secondary` / `ghost` bez decyzji produktowej.
- Linki nawigacyjne to `<a>` / router — nie udawaj linka samym Buttonem bez semantyki.
