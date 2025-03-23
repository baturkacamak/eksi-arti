/** @type {import('tailwindcss').Config} */
module.exports = {
    prefix: 'eksi-',
    content: [
        "./src/**/*.{ts,tsx,js,jsx}",
        "./options.html",
        "./popup.html"
    ],
    darkMode: 'class', // or 'media' for system preference
    theme: {
        extend: {
            colors: {
                primary: {
                    light: 'rgba(129, 193, 75, 0.1)',
                    medium: 'rgba(129, 193, 75, 0.2)',
                    DEFAULT: '#81c14b',
                    dark: '#72ad42',
                },
                secondary: {
                    light: 'rgba(255, 112, 99, 0.1)',
                    medium: 'rgba(255, 112, 99, 0.2)',
                    DEFAULT: '#ff7063',
                    dark: '#f05a4f',
                },
                danger: '#e53935',
                success: '#43a047',
                warning: '#ffa000',
                info: '#1e88e5',
            },
            fontFamily: {
                sans: [
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    'Roboto',
                    'Oxygen',
                    'Ubuntu',
                    'Cantarell',
                    '"Open Sans"',
                    '"Helvetica Neue"',
                    'sans-serif',
                ],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease',
                'slide-in': 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                },
                slideIn: {
                    '0%': { opacity: 0, transform: 'translateY(20px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}