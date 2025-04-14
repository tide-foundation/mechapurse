/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                app: {
                    background: "#0a0a0c",
                    surface: "#1a1c20",
                    accent: "#4da8da",
                    highlight: "#00FFF7",
                    muted: "#e0f7fa",
                    danger: "#ff3c8d",
                },
            },
            fontFamily: {
                hud: ["Orbitron", "monospace"],
                body: ["sans-serif"],
            },
            // boxShadow: {
            //     glow: "0 0 8px rgba(77, 168, 218, 0.8)",
            //     innerGlow: "inset 0 0 8px rgba(77, 168, 218, 0.4)",
            // },
        },
    },
    plugins: [],
};
