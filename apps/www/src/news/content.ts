/**
 * Marketing news — friendly feature stories only.
 * Not a changelog / commit feed. Keep copy user-facing and high-level.
 */

export interface NewsArticle {
  slug: string;
  date: string;
  title: string;
  teaser: string;
  /** Short paragraphs; no release notes jargon. */
  body: string[];
}

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    slug: "android-na-scenie",
    date: "2026-07",
    title: "Android na scenie: Console i Performer",
    teaser:
      "Prowadź show z telefonu lub tabletu i daj muzykom własne ekrany — w układzie dopasowanym do urządzenia.",
    body: [
      "StageSync na Androidzie to dwie aplikacje pod dwie role. Console to pełna kontrola koncertu: start i pauza, zmiana piosenek, podgląd setlisty — na telefonie albo tablecie, także z lokalnym hostem gdy chcesz grać bez osobnego komputera.",
      "Performer jest dla muzyków. Po połączeniu z siecią Wi‑Fi widzą nuty, akordy albo tekst dokładnie w tej samej chwili co reszta zespołu. Widoki są przygotowane pod mały i duży ekran — nie musisz brać tabletu, jeśli wolisz telefon na statywie.",
      "Obie aplikacje pobierzesz z tej strony. Instalacja jest prosta: pobierz APK, zainstaluj i dołącz do hosta w tej samej sieci.",
    ],
  },
  {
    slug: "desktop",
    date: "2026-07",
    title: "StageSync na komputerze",
    teaser:
      "Aplikacja na Windows i Mac — stąd najczęściej układacie setlistę i prowadzicie próbę albo koncert.",
    body: [
      "Desktop to aplikacja główna StageSync: tu budujesz setlistę, ustawiasz przebieg utworów i sterujesz tym, co widzą muzycy na swoich ekranach.",
      "Działa na Windowsie i Macu. Po instalacji uruchamiasz StageSync, otwierasz projekt i możesz od razu podłączać telefony oraz tablety w lokalnej sieci Wi‑Fi.",
      "To dobra baza na próbę w sali i na koncert — jeden komputer przy mikserze, reszta zespołu na własnych urządzeniach.",
    ],
  },
  {
    slug: "wspolny-punkt",
    date: "2026-07",
    title: "Cały zespół w jednym punkcie utworu",
    teaser:
      "Jedna setlista, wspólne tempo — ekrany muzyków same podążają za piosenką.",
    body: [
      "Najważniejsza obietnica StageSync jest prosta: wszyscy grają w tym samym miejscu utworu. Gdy ty zmieniasz piosenkę albo przewijasz setlistę, ekrany na scenie robią to razem z tobą.",
      "Muzycy nie muszą ręcznie przewijać PDF‑ów ani dogadywać się gestami „jesteśmy w refrenie”. Dostają swój widok — nuty, akordy albo tekst — zsynchronizowany z resztą zespołu.",
      "Dzięki temu próba i koncert wyglądają spokojniej: mniej chaosu przy zmianie utworu, więcej skupienia na grze.",
    ],
  },
];

export function articleBySlug(slug: string): NewsArticle | undefined {
  return NEWS_ARTICLES.find((a) => a.slug === slug);
}

export function articlesNewestFirst(): NewsArticle[] {
  return [...NEWS_ARTICLES];
}
