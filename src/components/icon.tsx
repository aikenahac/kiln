import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";

import { usePalette, type PaletteColor } from "@/providers/theme-provider";

type SymbolName = Extract<
  ComponentProps<typeof SymbolView>["name"],
  { ios?: unknown }
>;

// SF Symbols on iOS, Material Symbols on Android (expo-symbols 58).
const icons = {
  chevronRight: { ios: "chevron.right", android: "chevron_right" },
  chevronDown: { ios: "chevron.down", android: "expand_more" },
  up: { ios: "chevron.up", android: "keyboard_arrow_up" },
  down: { ios: "chevron.down", android: "keyboard_arrow_down" },
  copy: { ios: "doc.on.doc", android: "content_copy" },
  share: { ios: "square.and.arrow.up", android: "share" },
  search: { ios: "magnifyingglass", android: "search" },
  star: { ios: "star", android: "star" },
  starFill: { ios: "star.fill", android: "star" },
  warning: { ios: "exclamationmark.triangle.fill", android: "warning" },
  open: { ios: "arrow.up.right.square", android: "open_in_new" },
  phone: { ios: "iphone", android: "smartphone" },
  tablet: { ios: "ipad", android: "tablet" },
  mac: { ios: "laptopcomputer", android: "laptop_mac" },
  close: { ios: "xmark", android: "close" },
  add: { ios: "plus", android: "add" },
  check: { ios: "checkmark", android: "check" },
  platformAny: { ios: "ipad.and.iphone", android: "devices" },
  platformIos: { ios: "iphone", android: "phone_iphone" },
  platformAndroid: { ios: "smartphone", android: "android" },
  statusAny: { ios: "circle.dashed", android: "progress_activity" },
  statusRunning: { ios: "circle.fill", android: "circle" },
  statusFailed: { ios: "exclamationmark.triangle.fill", android: "warning" },
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  size = 17,
  color = "ink2",
}: {
  name: IconName;
  size?: number;
  color?: PaletteColor;
}) {
  const colors = usePalette();
  return (
    <SymbolView
      name={icons[name]}
      size={size}
      tintColor={colors[color]}
      accessible={false}
    />
  );
}
