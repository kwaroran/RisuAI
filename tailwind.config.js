/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,svelte}",
  ],
  theme: {
    extend: {
      colors:{

        //old Colors
          bgcolor: "var(--risu-theme-bgcolor)",
          darkbg: "var(--risu-theme-darkbg)",
          borderc: "var(--risu-theme-borderc)",
          selected: "var(--risu-theme-selected)",
          draculared: "var(--risu-theme-draculared)",
          textcolor: "var(--risu-theme-textcolor)",
          textcolor2: "var(--risu-theme-textcolor2)",
          darkborderc: "var(--risu-theme-darkborderc)",
          darkbutton: "var(--risu-theme-darkbutton)",

        //new Colors
        primary: {
          50: "var(--risu-theme-primary-50)",
          100: "var(--risu-theme-primary-100)",
          200: "var(--risu-theme-primary-200)",
          300: "var(--risu-theme-primary-300)",
          400: "var(--risu-theme-primary-400)",
          500: "var(--risu-theme-primary-500)",
          600: "var(--risu-theme-primary-600)",
          700: "var(--risu-theme-primary-700)",
          800: "var(--risu-theme-primary-800)",
          900: "var(--risu-theme-primary-900)",
        },

        secondary: {
          50: "var(--risu-theme-secondary-50)",
          100: "var(--risu-theme-secondary-100)",
          200: "var(--risu-theme-secondary-200)",
          300: "var(--risu-theme-secondary-300)",
          400: "var(--risu-theme-secondary-400)",
          500: "var(--risu-theme-secondary-500)",
          600: "var(--risu-theme-secondary-600)",
          700: "var(--risu-theme-secondary-700)",
          800: "var(--risu-theme-secondary-800)",
          900: "var(--risu-theme-secondary-900)",
        },

        danger: {
          50: "var(--risu-theme-danger-50)",
          100: "var(--risu-theme-danger-100)",
          200: "var(--risu-theme-danger-200)",
          300: "var(--risu-theme-danger-300)",
          400: "var(--risu-theme-danger-400)",
          500: "var(--risu-theme-danger-500)",
          600: "var(--risu-theme-danger-600)",
          700: "var(--risu-theme-danger-700)",
          800: "var(--risu-theme-danger-800)",
          900: "var(--risu-theme-danger-900)",
        },

        neutral: {
          50: "var(--risu-theme-neutral-50)",
          100: "var(--risu-theme-neutral-100)",
          200: "var(--risu-theme-neutral-200)",
          300: "var(--risu-theme-neutral-300)",
          400: "var(--risu-theme-neutral-400)",
          500: "var(--risu-theme-neutral-500)",
          600: "var(--risu-theme-neutral-600)",
          700: "var(--risu-theme-neutral-700)",
          800: "var(--risu-theme-neutral-800)",
          900: "var(--risu-theme-neutral-900)",
        },
        success: {
          50: "var(--risu-theme-success-50)",
          100: "var(--risu-theme-success-100)",
          200: "var(--risu-theme-success-200)",
          300: "var(--risu-theme-success-300)",
          400: "var(--risu-theme-success-400)",
          500: "var(--risu-theme-success-500)",
          600: "var(--risu-theme-success-600)",
          700: "var(--risu-theme-success-700)",
          800: "var(--risu-theme-success-800)",
          900: "var(--risu-theme-success-900)",
        }

        
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
        '96': '24rem',
        '110': '28rem',
        '124': '32rem',
        '138': '36rem',
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
        '4xl': 'var(--container-4xl);',
        '7xl': '1280px',
        '110': '28rem',
        '124': '32rem',
        '138': '36rem',
      },
      minHeight:{
        '2': '0.5rem',
        '8': '2rem',
        '5': '1.25rem',
        '14': '3.5rem',
        '20': '5rem',
        '32': '9rem',
        '4': "0.75rem",
        '96': '24rem',
        '110': '28rem',
        '124': '32rem',
        '138': '36rem',
      },
      height:{
        '96': '24rem',
        '110': '28rem',
        '124': '32rem',
        '138': '36rem',
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}

