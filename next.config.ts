import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, which rejects image/PDF attachments. Raise it.
      // Note: Vercel serverless functions cap the request body at ~4.5MB, so
      // the per-file caps in app/admin/actions.ts stay at 4MB. Larger files
      // would need a direct browser-to-Supabase upload.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
