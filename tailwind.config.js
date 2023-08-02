/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,svelte}",
  ],
  theme: {
    extend: {
      colors:{
          bgcolor: "var(--risu-theme-bgcolor)",
          darkbg: "var(--risu-theme-darkbg)",
          borderc: "var(--risu-theme-borderc)",
          selected: "var(--risu-theme-selected)",
          draculared: "var(--risu-theme-draculared)",
          textcolor: "var(--risu-theme-textcolor)",
          textcolor2: "var(--risu-theme-textcolor2)",
          darkborderc: "var(--risu-theme-darkborderc)",
          darkbutton: "var(--risu-theme-darkbutton)",
      },
      minWidth: {
        '2': '0.5rem',
        '8': '2rem',
        '12': '3rem',
        '20': '5rem',
        '14': '3.5rem',
        'half': '50%',
        '5': '1.25rem',
        '6': '1.5rem',

      },
      maxWidth:{
        'half': '50%',
        '80p': '80%',
        '80vw': '80vw',
        '14': '3.5rem',
        '24': '6rem',
        '36': '9rem',
        '100vw': '100vw'
      },
      borderWidth: {
        '1': '1px',
      },
      width: {
        '2xl': '48rem',
        '3xl': '72rem',
      },
      minHeight:{
        '2': '0.5rem',
        '8': '2rem',
        '5': '1.25rem',
        '14': '3.5rem',
        '20': '5rem',
        '32': '9rem',
        '4': "0.75rem"
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}

