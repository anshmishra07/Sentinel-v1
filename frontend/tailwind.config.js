/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
      extend: {
        colors: {
          console: {
            bg: "#0B0E0F",
            panel: "#131718",
            border: "#222827",
            text: "#D8E0DE",
            muted: "#7C8886"
          },
          ok: "#3FB68B",
          warn: "#E0A638",
          crit: "#E0544A"
        },
        fontFamily: {
          mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
          sans: ["Inter", "system-ui", "sans-serif"]
        }
      }
    },
    plugins: []
  };