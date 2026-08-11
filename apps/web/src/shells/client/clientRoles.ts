export type ClientRoleId = "karaoke" | "grid" | "score" | "drums";

export const CLIENT_ROLES: { id: ClientRoleId; label: string; icon: string }[] =
  [
    { id: "karaoke", label: "Tekst", icon: "🎤" },
    { id: "grid", label: "Akordy", icon: "🎹" },
    { id: "score", label: "Partytura", icon: "🎼" },
    { id: "drums", label: "Forma", icon: "🥁" },
  ];
