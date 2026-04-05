import { ImageResponse } from "next/og";

// 1200×630 is the canonical Open Graph size that Twitter, Slack, iMessage,
// Discord, LinkedIn, and Facebook all use for link previews.
export const alt = "MUN MIND — a private space to check in with yourself";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #FAF9F4 0%, #E6EEE9 60%, #C8DCD2 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Wordmark row — matches the header: teal square + leaf + "MUN MIND" */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 18,
              background: "#13423D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3c-4 3-6 7-6 11 0 3 2 6 6 7 4-1 6-4 6-7 0-4-2-8-6-11z"
                fill="#FAF9F4"
              />
              <path
                d="M12 7c-2 2-3 5-3 8 0 1 .5 2 1.5 2.5 0-3 .5-6 1.5-9V7z"
                fill="#13423D"
              />
            </svg>
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: "#13423D",
              letterSpacing: "-0.02em",
            }}
          >
            MUN MIND
          </div>
        </div>

        {/* Hero copy — same tone as the landing page. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 82,
              fontWeight: 800,
              color: "#13423D",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: 1040,
            }}
          >
            A private space to check in with yourself.
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 400,
              color: "#42655C",
              lineHeight: 1.4,
              maxWidth: 1000,
            }}
          >
            Anonymous. No login. Built for Memorial University students.
          </div>
        </div>
      </div>
    ),
    size
  );
}
