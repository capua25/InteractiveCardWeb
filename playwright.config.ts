import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3100" },
  // El canvas 3D del tour tarda 10–14 s en aparecer con WebGL por software (SwiftShader) en CI/headless; el default de 5 s no alcanza.
  expect: { timeout: 30_000 },
  // Con el expect de 30 s, un test con varios taps sobre el canvas lento supera el default de 30 s por test.
  timeout: 60_000,
  // El headless de Chromium trae WebGL por SwiftShader (ANGLE/Vulkan): tour.spec no necesita flags de GPU.
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npm run build && npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
