module.exports = {
  apps: [
    {
      name: "cs2-webradar-relay",
      script: "app.js",
      cwd: __dirname,
      env: {
        PORT: process.env.PORT || 22006,
        WS_PATH: process.env.WS_PATH || "/cs2_webradar",
        // Comma-separated origins, e.g. "https://seuapp.netlify.app,https://example.com"
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "",
        // For TLS termination directly in Node (optional; typically use Nginx/Cloudflare)
        TLS_KEY_FILE: process.env.TLS_KEY_FILE || "",
        TLS_CERT_FILE: process.env.TLS_CERT_FILE || "",
      },
      instances: 1,
      exec_mode: "fork",
      max_restarts: 10,
      watch: false,
    },
  ],
};

