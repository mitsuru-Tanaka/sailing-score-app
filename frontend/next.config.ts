import type { NextConfig } from "next";

// start_local.sh が LOCAL_IP 環境変数をセットして起動する
const localIp = process.env.LOCAL_IP;

const allowedOrigins = ["127.0.0.1", "localhost"];
if (localIp) {
  allowedOrigins.push(localIp);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedOrigins,
};

export default nextConfig;
