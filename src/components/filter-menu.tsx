import { MenuView, type MenuAction } from "@expo/ui/community/menu";
import { Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { useKilnTheme, type PaletteColor } from "@/providers/theme-provider";

/** How an active (non-default) filter is drawn. "ink" inverts the pill; "live"/"alarm" ring it in that status colour. */
export type FilterTone = "ink" | "live" | "alarm";

export type FilterOption<T extends string> = {
  value: T;
  /** Label in the menu, and on the trigger when this option is active. */
  label: string;
  icon?: IconName;
  /** SF Symbol shown beside the menu item (iOS only; Android menus show the checkmark alone). */
  menuImage?: MenuAction["image"];
  tone?: FilterTone;
};

const ringClass: Record<Exclude<FilterTone, "ink">, string> = {
  live: "border-live",
  alarm: "border-alarm",
};
const toneInk: Record<Exclude<FilterTone, "ink">, { icon: PaletteColor; text: string }> = {
  live: { icon: "live", text: "text-live-ink" },
  alarm: { icon: "alarm", text: "text-alarm-ink" },
};

/**
 * One filter in the Activity filter row: a native menu (SwiftUI Menu / Compose DropdownMenu)
 * whose trigger is a pill ("Builds ⌄") or an icon button that grows into a labelled pill while
 * the filter is active. The first option is the unfiltered default.
 */
export function FilterMenu<T extends string>({
  name,
  options,
  value,
  onChange,
  variant,
  shrink = false,
  labelWhenActive = true,
}: {
  /** Name of the filter, e.g. "Type". A pill shows it while unset; it's also the spoken name. */
  name: string;
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant: "pill" | "icon";
  /** Let this trigger give up width (and truncate its label) when the row is tight. */
  shrink?: boolean;
  /** Icon variant only: show the active option's label beside the icon. Off on narrow phones. */
  labelWhenActive?: boolean;
}) {
  const { isDark } = useKilnTheme();
  const current = options.find((option) => option.value === value) ?? options[0];
  const active = current.value !== options[0].value;
  const tone = current.tone ?? "ink";
  const actions: MenuAction[] = options.map((option) => ({
    id: option.value,
    title: option.label,
    image: option.menuImage,
    state: option.value === value ? "on" : "off",
  }));

  const inverted = active && tone === "ink";
  const ringed = active && tone !== "ink";
  const fill = inverted
    ? "bg-ink"
    : ringed
      ? `border-[1.5px] bg-raised-2 ${ringClass[tone]}`
      : "bg-raised-2";
  const textClass = inverted ? "text-ground" : ringed ? toneInk[tone].text : "text-ink";
  const iconColor: PaletteColor = inverted ? "ground" : ringed ? toneInk[tone].icon : "ink2";
  const iconOnly = variant === "icon" && (!active || !labelWhenActive);

  return (
    <MenuView
      actions={actions}
      onPressAction={({ nativeEvent }) => {
        const next = options.find((option) => option.value === nativeEvent.event);
        if (next) onChange(next.value);
      }}
      colorScheme={isDark ? "dark" : "light"}
      // Only a chosen value may truncate; the unset name ("Project") always shows in full.
      style={shrink && active ? { flexShrink: 1, minWidth: 0 } : undefined}
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${name} filter, ${current.label}`}
        accessibilityHint="Opens a menu"
        className={`h-11 flex-row items-center rounded-full ${fill} ${
          iconOnly ? "w-11 justify-center" : variant === "icon" ? "gap-1.5 pl-3 pr-3.5" : "gap-1 pl-3.5 pr-2.5"
        }`}
      >
        {variant === "icon" && current.icon ? (
          <Icon name={current.icon} size={17} color={iconColor} />
        ) : null}
        {iconOnly ? null : (
          <Text
            numberOfLines={1}
            className={`shrink text-[15px] font-semibold ${textClass}`}
          >
            {active ? current.label : name}
          </Text>
        )}
        {variant === "pill" ? (
          <Icon name="chevronDown" size={12} color={inverted ? "ground" : "ink3"} />
        ) : null}
      </View>
    </MenuView>
  );
}
