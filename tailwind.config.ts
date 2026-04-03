import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f0f5f3',
          100: '#d9e8e2',
          200: '#b3d1c5',
          300: '#8dbaa8',
          400: '#6ea393',
          500: '#5B8C7B',
          600: '#497063',
          700: '#37544a',
          800: '#243832',
          900: '#121c19',
        },
        cream: {
          50: '#FFFEFB',
          100: '#FAF7F2',
          200: '#F5EFEA',
          300: '#EDE4DB',
        },
        terra: {
          50: '#fdf4ed',
          100: '#f9e4d3',
          200: '#f0c9a7',
          300: '#e5a97b',
          400: '#D4956A',
          500: '#c07a4f',
          600: '#a66240',
          700: '#864c34',
          800: '#6b3c2b',
          900: '#4d2c21',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
