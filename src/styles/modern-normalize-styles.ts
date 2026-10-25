import { css, unsafeCSS } from "lit";
import normalizeCss from "modern-normalize/modern-normalize.css?raw";

export const modernNormalizeStyles = css`${unsafeCSS(normalizeCss)}`;
