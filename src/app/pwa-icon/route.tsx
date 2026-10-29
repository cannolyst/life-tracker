import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

const SIZES = [180, 192, 512];

// The Home Screen icon: the app's four-point sparkle on amethyst. `maskable`
// pads it so Android's circular crop never clips the star.
export function GET(request: NextRequest) {
  const requested = Number(request.nextUrl.searchParams.get("size"));
  const size = SIZES.includes(requested) ? requested : 192;
  const maskable = request.nextUrl.searchParams.get("maskable") === "1";
  const star = Math.round(size * (maskable ? 0.4 : 0.56));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6e4e93",
        }}
      >
        <svg width={star} height={star} viewBox="0 0 24 24">
          <path d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6Z" fill="#fbeff5" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
