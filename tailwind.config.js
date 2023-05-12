/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,svelte}"],
  theme: {
    extend: {
      colors: {
        bgcolor: "#282a36",
        darkbg: "#21222C",
        borderc: "#6272a4",
        selected: "#44475a",
        draculared: "#ff5555",
      },
      minWidth: {
        20: "5rem",
        14: "3.5rem",
        half: "50%",
      },
      maxWidth: {
        half: "50%",
        "80p": "80%",
        "80vw": "80vw",
        14: "3.5rem",
        "100vw": "100vw",
      },
      borderWidth: {
        1: "1px",
      },
      width: {
        "2xl": "48rem",
        "3xl": "72rem",
      },
      minHeight: {
        8: "2rem",
        14: "3.5rem",
        20: "5rem",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
