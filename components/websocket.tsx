import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const WS_BASE = "wss://semivolatile-nancey-incongrously.ngrok-free.dev";
type MLMessage = {
  history_id: number;
  status: string;
  ml_result: {
    pest_detected: boolean;
    pest_type: string;
    severity: string;
    confidence: number;
    recommendation: string;
  };
};

export default function FarmActivity({
  isOpen,
  farmId,
  onRegisterStart,
}: {
  farmId: string;
  onRegisterStart: (fn: () => void) => void;
  isOpen: () => void;
}) {
  const socketRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<MLMessage | null>(null);
  const [connected, setConnected] = useState(false);

  const startWebSocket = () => {
    if (socketRef.current) return;
    console.log("Starting WebSocket connection for farmId:", farmId);
    const ws = new WebSocket(`${WS_BASE}/ws/farm/${farmId}/`);

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      isOpen();
      setConnected(true);
    };

    ws.onmessage = (event) => {
      console.log("📩 Message:", event.data);
      try {
        const payload =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        setMessages(payload as MLMessage);
      } catch (error) {
        console.error("Failed to parse WebSocket message", error, event.data);
      }
    };

    ws.onerror = (error) => {
      console.log("❌ WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("🔌 WebSocket closed");
      setConnected(false);
      socketRef.current = null;
    };

    socketRef.current = ws;
    setTimeout(() => {
      if (socketRef.current) {
        console.log("⏰ Closing WebSocket after 10s");
        setMessages(null);
        socketRef.current.close();
      }
    }, 100000);
  };

  useEffect(() => {
    onRegisterStart(startWebSocket);
  }, []);

  const notificationBackground = messages?.ml_result.pest_detected
    ? "#FEF3C7"
    : "#ECFDF5";

  const notificationBorderColor = messages?.ml_result.pest_detected
    ? "#D97706"
    : "#16A34A";

  return (
    <View style={{ padding: 20 }}>
      {messages ? (
        <View
          style={{
            backgroundColor: notificationBackground,
            padding: 18,
            borderRadius: 14,
            // borderLeftWidth: 6,
            // borderLeftColor: notificationBorderColor,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 10 }}>
            Farm activity update
          </Text>
          <Text style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>
            Status: {messages.status}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 8 }}>
            {messages.ml_result.pest_detected
              ? `Pest detected: ${messages.ml_result.pest_type}`
              : "No pest detected"}
          </Text>
          <Text style={{ fontSize: 14, color: "#111827", marginBottom: 4 }}>
            Severity: {messages.ml_result.severity}
          </Text>
          <Text style={{ fontSize: 14, color: "#111827", marginBottom: 4 }}>
            Confidence: {(messages.ml_result.confidence * 100).toFixed(0)}%
          </Text>
          <Text style={{ fontSize: 14, color: "#111827" }}>
            Recommendation: {messages.ml_result.recommendation}
          </Text>
        </View>
      ) : (
        <Text style={{ color: "#6B7280" }}>
          Waiting for farm activity notifications...
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  toast: {
    minWidth: 180,
    maxWidth: 260,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#2e3de2cb", // dark toast
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    color: "white",
  },
});
