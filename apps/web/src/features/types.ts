export type Panel = null | "portfolio" | "holding" | "import" | "watch" | "remove" | "rename";
export type OpenPanel = (panel: Panel) => void;
export type Action = (fn: () => Promise<unknown>, success?: string) => Promise<void>;
