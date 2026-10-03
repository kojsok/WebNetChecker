import { ImageResponse } from "next/og";

export const runtime = "edge";

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: 1200,
          height: 630,
          backgroundColor: "#000000",
          fontFamily: "system-ui, sans-serif",
          color: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            WebNet
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#FF5E00",
            }}
          >
            Checker
          </span>
        </div>
        <p
          style={{
            fontSize: 28,
            color: "#C0C0C0",
            maxWidth: 800,
            textAlign: "center",
          }}
        >
          Мониторинг доступности сервисов в реальном времени
        </p>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}