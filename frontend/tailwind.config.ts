import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        electric: "#3B82F6",
        ember: "#F97316"
      },
      borderRadius: { "2xl": "1rem" }
    }
  },
  plugins: []
};
export default config;
