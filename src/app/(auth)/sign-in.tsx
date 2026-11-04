import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { errorCopy } from "@/api/errors";
import { PhaseLamps, type LampPhase } from "@/components/phase-lamps";
import { useAuth } from "@/providers/auth-provider";
import { palette, useKilnTheme } from "@/providers/theme-provider";

type Step = "paste" | "check" | "accounts" | "save";
const names = ["Paste", "Check", "Accounts", "Save"];

function phases(step: Step): LampPhase[] {
  const active = ["paste", "check", "accounts", "save"].indexOf(step);
  return names.map((name, index) => ({
    name,
    state: index < active ? "done" : index === active ? "live" : "off",
  }));
}

export default function SignInScreen() {
  const { signIn, recoveryMessage } = useAuth();
  const { isDark } = useKilnTheme();
  const colors = isDark ? palette.dark : palette.light;
  const [token, setToken] = useState("");
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>("paste");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const submit = async () => {
    if (!token.trim() || busy) return;
    setBusy(true);
    setError(null);
    setStep("check");
    try {
      await signIn(token, setStep);
    } catch (reason) {
      setError(errorCopy(reason));
      setStep("paste");
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: colors.ground }]}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        scrollEnabled={keyboardVisible}
        bounces={keyboardVisible}
        alwaysBounceVertical={false}
        showsVerticalScrollIndicator={keyboardVisible}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <PhaseLamps phases={phases(step)} size="hero" />
          <Text style={[styles.title, { color: colors.ink }]}>
            Kiln
          </Text>
          <Text style={[styles.subtitle, { color: colors.ink2 }]}>
            Your Expo account, from the build queue to production. Kiln stores
            your personal access token only on this device.
          </Text>
        </View>
        {recoveryMessage ? (
          <View style={[styles.message, { backgroundColor: colors.raised }]}>
            <Text style={[styles.messageText, { color: colors.ink }]}>
              {recoveryMessage}
            </Text>
          </View>
        ) : null}
        <View style={styles.form}>
          <View style={[styles.field, { backgroundColor: colors.raised }]}>
            <TextInput
              value={token}
              onChangeText={(value) => {
                setToken(value);
                setError(null);
              }}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Expo personal access token"
              placeholderTextColor={colors.ink2}
              style={[styles.input, { color: colors.ink }]}
              accessibilityLabel="Expo personal access token"
            />
            <Pressable
              onPress={() => setVisible((value) => !value)}
              style={styles.visibilityButton}
            >
              <Text style={[styles.visibilityText, { color: colors.ink2 }]}>
                {visible ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>
          {error ? (
            <Text
              style={[styles.error, { color: colors.alarm }]}
              selectable
            >
              {error}
            </Text>
          ) : null}
          <Pressable
            onPress={() =>
              void WebBrowser.openBrowserAsync(
                "https://expo.dev/settings/access-tokens",
              )
            }
          >
            <Text style={[styles.link, { color: colors.ink }]}>
              Create a token in Expo settings
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => void submit()}
          disabled={!token.trim() || busy}
          style={[
            styles.connectButton,
            { backgroundColor: colors.ink },
            (!token.trim() || busy) && styles.disabled,
          ]}
        >
          <Text style={[styles.connectText, { color: colors.ground }]}>
            {busy ? "Checking token" : "Connect Expo"}
          </Text>
        </Pressable>
        <Text style={[styles.footnote, { color: colors.ink2 }]}>
          Unofficial client. Kiln is not affiliated with Expo. Internal API
          fields can change.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 28,
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  hero: { gap: 16 },
  title: {
    marginTop: 12,
    fontSize: 52,
    fontWeight: "900",
    lineHeight: 54,
    letterSpacing: -1,
  },
  subtitle: { maxWidth: 340, fontSize: 17, lineHeight: 23 },
  message: { borderRadius: 16, padding: 16 },
  messageText: { fontSize: 15, lineHeight: 20 },
  form: { gap: 12 },
  field: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 17 },
  visibilityButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  visibilityText: { fontWeight: "600" },
  error: { fontFamily: "Menlo", fontSize: 13, lineHeight: 19 },
  link: { fontSize: 15, fontWeight: "600", textDecorationLine: "underline" },
  connectButton: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
  },
  disabled: { opacity: 0.4 },
  connectText: { fontSize: 17, fontWeight: "600" },
  footnote: { fontSize: 13, lineHeight: 18 },
});
