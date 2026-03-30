import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: {
            900: "#0A1929",
            800: "#122A46",
            700: "#1B3A5C",
            600: "#234B73",
            500: "#2C5F8A",
            400: "#4A7FB5",
            300: "#7AABD4",
            200: "#B3D4F0",
            100: "#E3F0FA",
            50: "#F0F7FD",
          },
          orange: {
            600: "#E07C00",
            500: "#F7941D",
            400: "#FBA94C",
            300: "#FCC47D",
            200: "#FDE0B0",
            100: "#FFF3E0",
          },
          yellow: {
            500: "#FFC107",
            400: "#FFD54F",
            300: "#FFE082",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
