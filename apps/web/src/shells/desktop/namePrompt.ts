export type NamePromptKind =
  | "new-song"
  | "new-template"
  | "new-from-template"
  | "save-as";

export type NamePromptState = {
  kind: NamePromptKind;
  title: string;
  defaultValue: string;
  templateId?: string;
  sourceId?: string;
};
