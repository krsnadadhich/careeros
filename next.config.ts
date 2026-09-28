import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default is 1MB; resumes are small PDFs but need headroom above the
    // app-level 8MB file-size cap (the limit covers the raw multipart body,
    // not just the file bytes).
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
