> [📦 StageSync](../../README.md) / [docs](../README.md)

# 📦 examples/ — Przykładowe Pliki Projektów

Katalog `examples/` zawiera referencyjne pliki danych StageSync, służące jako wzorce formatu i materiał do testów manualnych.

## 📁 Zawartość

| Katalog        | Opis                                                |
| :------------- | :-------------------------------------------------- |
| [`v5/`](./v5/) | Przykładowe pliki w formacie v5 (`ProjectSchemaV5`) |

### v5/

- [`library.pack.sample.stagesync.json`](./v5/library.pack.sample.stagesync.json) — przykładowy pakiet eksportu biblioteki (`stagesyncExportVersion: 3`), przydatny do testowania importu przez `POST /api/library/import`.

## 🔗 Powiązane

- Schemat projektu v5: [ADR 0009](../adr/0009-project-schema-v3.md)
- Specyfikacja API importu/eksportu: [docs/api/README.md](../api/README.md)
