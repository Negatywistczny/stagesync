> [📦 StageSync](../../README.md) / [docs](../README.md)

# 🏛️ docs/architecture/ — Architektura i Decyzje Projektowe

Katalog zawiera kanoniczny opis architektury systemu StageSync, zasady autorytetu serwera czasu (SSOT), specyfikacje protokołów oraz formalny rejestr decyzji architektonicznych (ADR).

---

## 📁 Zawartość katalogu

| Zasób                                    | Opis                                                                                       |
| :--------------------------------------- | :----------------------------------------------------------------------------------------- |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Główna mapa architektury, Timebase SSOT (ticks / PPQ / BBT), transport i granice pakietów. |
| **[`adr/`](./adr/README.md)**            | Rejestr decyzji architektonicznych (_Architecture Decision Records_, ADR 0001–0019).       |
| **[`api/`](./api/README.md)**            | Specyfikacja protokołów REST oraz WebSocket (`/ws/transport`).                             |
| **[`ui/`](./ui/README.md)**              | Specyfikacja Design Systemu (kolory, typografia, spacing, inwentarz kontrolek UI).         |

---

## 🔗 Powiązane

- Standardy kodowania i testowania: **[docs/standards/](../standards/README.md)**
- Podręczniki operacyjne: **[docs/guides/](../guides/README.md)**
- Długoterminowa roadmapa: **[docs/ROADMAP.md](../ROADMAP.md)**
