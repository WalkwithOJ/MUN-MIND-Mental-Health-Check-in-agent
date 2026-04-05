import { ImageResponse } from "next/og";

// iOS "Add to Home Screen" icon. Same mark as the browser favicon but at
// 180×180 with a fuller bleed since iOS masks the corners itself.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#13423D",
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
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
    ),
    size
  );
}
