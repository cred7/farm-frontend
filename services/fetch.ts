import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Platform } from "react-native";

const urls =
  Platform.OS === "android"
    ? "https://semivolatile-nancey-incongrously.ngrok-free.dev"
    : "";
export const BACKEND_URL = urls + "/api/";

export class AuthExpiredError extends Error {
  status = 401;
  constructor(message = "Session expired") {
    super(message);
    this.name = "AuthExpiredError";
  }
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function logoutUser() {
  await AsyncStorage.removeItem("accessToken");
  await AsyncStorage.removeItem("refreshToken");
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  const normalized: Record<string, string> = {};

  if (!headers) return normalized;
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      normalized[key] = value;
    });
  } else {
    Object.assign(normalized, headers);
  }

  return normalized;
}

export async function apiFetch(input: string, init: RequestInit = {}) {
  const token = await AsyncStorage.getItem("accessToken");
  const headers = normalizeHeaders(init.headers);

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url =
    input.startsWith("http://") || input.startsWith("https://")
      ? input
      : `${BACKEND_URL}${input.replace(/^\/+/, "")}`;

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    await logoutUser();
    console.warn("Session expired. User logged out.");
    router.replace("/login");
    throw new AuthExpiredError("Session expired. Please log in again.");
  }

  if (!response.ok) {
    let body: any = null;
    const contentType = response.headers.get("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        body = await response.json();
      } else {
        body = await response.text();
      }
    } catch {
      body = null;
    }

    const message =
      typeof body === "string"
        ? body || response.statusText
        : JSON.stringify(body) || response.statusText;

    throw new ApiError(message, response.status, body);
  }

  return response;
}
