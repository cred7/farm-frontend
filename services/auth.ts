// services/auth.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const urls =
  Platform.OS === "android"
    ? "https://semivolatile-nancey-incongrously.ngrok-free.dev"
    : "http://localhost:8000";
const BACKEND_URL = urls + "/api/";
export async function registerUser(
  name: string,
  email: string,
  password: string,
) {
  const res = await fetch(BACKEND_URL + "auth/register/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  return data;
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(BACKEND_URL + "auth/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");

  // Save JWT
  await AsyncStorage.setItem("accessToken", data.access);
  await AsyncStorage.setItem("refreshToken", data.refresh);

  return data;
}

export async function logoutUser() {
  await AsyncStorage.removeItem("accessToken");
  await AsyncStorage.removeItem("refreshToken");
}
