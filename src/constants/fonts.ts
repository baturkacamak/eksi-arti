export const MATERIAL_ICONS = {
    FONT_URL: 'https://fonts.gstatic.com/s/materialicons/v139/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2',
    FONT_FAMILY: 'Material Icons',
    VERSION: 'v139'
} as const;

export const FONT_FACE_CSS = `
@font-face {
    font-family: '${MATERIAL_ICONS.FONT_FAMILY}';
    font-style: normal;
    font-weight: 400;
    src: url(${MATERIAL_ICONS.FONT_URL}) format('woff2');
}

.material-icons {
    font-family: '${MATERIAL_ICONS.FONT_FAMILY}';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
}
`; 