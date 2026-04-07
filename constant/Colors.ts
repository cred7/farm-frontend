export const Colors = {
  primary: "#6849a7",
  warning: "#cc475a",
  dark: {
    text: "#161414",
    title: "#fff",
    background: "#7a7a8079",
    navBackground: "#aa9ef652",
    iconColor: "#686477",
    iconColorFocused: "#201e2b",
    uiBackground: "#d6d5e1",
  },
  light: {
    text: "#0d0c10",
    title: "#201e2b",
    background: "#e0dfe8",
    navBackground: "#e8e7ef",
    iconColor: "#686477",
    iconColorFocused: "#201e2b",
    uiBackground: "#d6d5e1",
  },
} as const;

export type Theme = typeof Colors.light | typeof Colors.dark;

export const getTheme = (
  colorScheme: "undefined" | "light" | "dark",
): Theme => {
  return colorScheme === "dark" ? Colors.dark : Colors.light;
};
