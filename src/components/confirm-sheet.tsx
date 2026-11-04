import type { ReactNode } from "react";
import { Modal, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/screen-parts";

export type ConfirmScope = { label: string; value: string }[];

/**
 * Confirmation for destructive or production-impacting changes. States the
 * exact scope and before → after. The safe option is the secondary button.
 */
export function ConfirmSheet({
  visible,
  title,
  body,
  scope,
  before,
  after,
  visual,
  confirmLabel,
  safeLabel = "Keep as is",
  destructive = false,
  disabled = false,
  pending = false,
  error,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  body?: string;
  scope: ConfirmScope;
  before?: string;
  after?: string;
  visual?: ReactNode;
  confirmLabel: string;
  safeLabel?: string;
  destructive?: boolean;
  disabled?: boolean;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <View className="flex-1 bg-ground">
        <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-6">
          <View className="h-1.5 w-10 self-center rounded-full bg-rule" />
          <Text className="text-[28px] font-bold leading-[34px] text-ink">{title}</Text>
          {body ? (
            <Text className="text-[15px] leading-[21px] text-ink-2">{body}</Text>
          ) : null}
          <View className="overflow-hidden rounded-[22px] bg-raised android:rounded-2xl">
            {scope.map((item) => (
              <View key={item.label} className="flex-row gap-3 border-b border-rule px-4 py-3 last:border-b-0">
                <Text className="w-24 text-[15px] text-ink-2">{item.label}</Text>
                <Text className="flex-1 text-[15px] font-semibold text-ink" selectable>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
          {before !== undefined && after !== undefined ? (
            <View className="flex-row items-baseline gap-3">
              <Text
                className="text-[40px] font-black text-ink-3"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {before}
              </Text>
              <Text className="text-[22px] text-ink-3">→</Text>
              <Text
                className={`text-[40px] font-black ${destructive ? "text-alarm-ink" : "text-ink"}`}
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {after}
              </Text>
            </View>
          ) : null}
          {visual}
          {error ? (
            <Text className="font-mono text-[13px] leading-[19px] text-alarm-ink" selectable>
              {error}
            </Text>
          ) : null}
          <View className="gap-3 pt-2">
            <Button
              label={confirmLabel}
              variant={destructive ? "destructive" : "primary"}
              pending={pending}
              disabled={disabled}
              pendingLabel="Saving"
              onPress={onConfirm}
            />
            <Button label={safeLabel} onPress={onClose} disabled={pending} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
