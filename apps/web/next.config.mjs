import constants from "next/constants.js";

export default function config(phase) {
  const common = { poweredByHeader: false, images: { unoptimized: true } };
  if (phase === constants.PHASE_DEVELOPMENT_SERVER) {
    const origin = process.env.LOKIFI_API_ORIGIN || "http://127.0.0.1:18100";
    return { ...common, rewrites: async () => [{ source: "/api/v1/:path*", destination: `${origin}/api/v1/:path*` }] };
  }
  return { ...common, output: "export" };
}
