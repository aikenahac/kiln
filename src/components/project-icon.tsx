import { Image } from "expo-image";
import { memo, useState } from "react";
import { Platform, Text, View } from "react-native";

import type { ProjectSummary } from "@/types/api";

const sizes = {
  sm: { box: 28, radius: 7, text: "text-[12px]" },
  md: { box: 44, radius: 11, text: "text-base" },
  lg: { box: 64, radius: 15, text: "text-2xl" },
} as const;

/**
 * App icon from App.profileImageUrl (falling back to the classic-updates
 * App.icon), fetched from Expo's CDN without the Expo token.
 * Squircle-ish corners on iOS, circle on Android, a monogram when the project
 * has no icon or the image fails.
 */
export const ProjectIcon = memo(function ProjectIcon({
  project,
  size = "md",
}: {
  project: Pick<ProjectSummary, "name" | "icon" | "profileImageUrl">;
  size?: keyof typeof sizes;
}) {
  const [failed, setFailed] = useState(false);
  const { box, radius, text } = sizes[size];
  const borderRadius = Platform.OS === "android" ? box / 2 : radius;
  const url = project.profileImageUrl ?? project.icon?.url;
  if (url && !failed) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: box, height: box, borderRadius }}
        contentFit="cover"
        transition={120}
        cachePolicy="memory-disk"
        recyclingKey={url}
        onError={() => setFailed(true)}
        accessible={false}
      />
    );
  }
  return (
    <View
      style={{ width: box, height: box, borderRadius }}
      className="items-center justify-center border border-rule bg-raised-2"
      accessible={false}
    >
      <Text className={`${text} font-bold text-ink`}>
        {project.name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
});
