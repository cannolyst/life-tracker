export const BACKGROUND_COLORS = ["pink", "green", "blue", "purple", "yellow", "orange"] as const;
export type BackgroundColor = (typeof BACKGROUND_COLORS)[number];
