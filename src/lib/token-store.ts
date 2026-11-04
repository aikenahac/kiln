import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  createMMKV,
  deleteMMKV,
  existsMMKV,
  type MMKV,
} from "react-native-mmkv";

import { tokenRecoveryAction } from "@/lib/token-recovery";

const STORE_ID = "kiln.token";
const KEY_NAME = "kiln.mmkv.encryption-key.v1";
const TOKEN_NAME = "expoPersonalAccessToken";

let secureStorage: MMKV | null = null;
let webToken: string | null = null;

function makeKey(): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = Crypto.getRandomBytes(32);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function open(key: string): MMKV {
  return createMMKV({
    id: STORE_ID,
    encryptionKey: key,
    encryptionType: "AES-256",
  });
}

export type TokenRestore = { token: string | null; recovered: boolean };

export async function restoreToken(): Promise<TokenRestore> {
  if (Platform.OS === "web") return { token: webToken, recovered: false };
  const key = await SecureStore.getItemAsync(KEY_NAME);
  if (!key) {
    const orphaned = existsMMKV(STORE_ID);
    if (tokenRecoveryAction(false, orphaned) === "wipe-orphan")
      deleteMMKV(STORE_ID);
    secureStorage = null;
    return { token: null, recovered: orphaned };
  }
  try {
    secureStorage = open(key);
    return {
      token: secureStorage.getString(TOKEN_NAME) ?? null,
      recovered: false,
    };
  } catch {
    if (existsMMKV(STORE_ID)) deleteMMKV(STORE_ID);
    await SecureStore.deleteItemAsync(KEY_NAME);
    secureStorage = null;
    return { token: null, recovered: true };
  }
}

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    webToken = token;
    return;
  }
  let key = await SecureStore.getItemAsync(KEY_NAME);
  if (!key) {
    if (existsMMKV(STORE_ID)) deleteMMKV(STORE_ID);
    key = makeKey();
    await SecureStore.setItemAsync(KEY_NAME, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  secureStorage = open(key);
  secureStorage.set(TOKEN_NAME, token);
}

export async function deleteToken(): Promise<void> {
  webToken = null;
  try {
    secureStorage?.clearAll();
  } finally {
    secureStorage = null;
    if (Platform.OS !== "web") {
      if (existsMMKV(STORE_ID)) deleteMMKV(STORE_ID);
      await SecureStore.deleteItemAsync(KEY_NAME);
    }
  }
}
