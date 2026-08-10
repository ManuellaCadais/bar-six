'use client';

/**
 * Gera o cartaz do QR (layout + código) como PNG, desenhando um SVG
 * autocontido na mão e rasterizando via <canvas>.
 *
 * Por quê não usar uma lib de "DOM para imagem" (html-to-image etc.)?
 * Testado e travou de forma consistente clonando esta árvore (fontes
 * customizadas + SVG aninhado do QR). Um SVG construído à mão, com as
 * fontes embutidas como data URI, é 100% previsível: não depende de
 * clonar/serializar o DOM vivo, só de texto e formas nativas.
 */

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Acha o nome de família real (gerado pelo next/font) por trás de uma CSS var. */
function resolveFontFamily(cssVar: string): string | null {
  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.fontFamily = `var(${cssVar})`;
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily.split(',')[0]?.trim().replace(/^["']|["']$/g, '');
  document.body.removeChild(probe);
  return family || null;
}

/** Busca todas as @font-face cujo font-family bate, baixa e embute como base64. */
async function embedFontFace(family: string): Promise<string> {
  const rules: string[] = [];
  const seenUrls = new Set<string>();

  for (const sheet of Array.from(document.styleSheets)) {
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
    } catch {
      continue; // stylesheet de outra origem — pula
    }
    for (const rule of Array.from(cssRules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const ruleFamily = rule.style.getPropertyValue('font-family').replace(/^["']|["']$/g, '');
      if (ruleFamily !== family) continue;

      const src = rule.style.getPropertyValue('src');
      const match = src.match(/url\(["']?([^"')]+)["']?\)\s*format\(["']?woff2?["']?\)/);
      const url = match?.[1] ?? src.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);

      try {
        const res = await fetch(url, { cache: 'force-cache' });
        const buf = await res.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        const weight = rule.style.getPropertyValue('font-weight') || '400';
        const style = rule.style.getPropertyValue('font-style') || 'normal';
        rules.push(
          `@font-face { font-family: '${family}'; font-weight: ${weight}; font-style: ${style}; src: url(data:font/woff2;base64,${b64}) format('woff2'); }`,
        );
      } catch {
        /* se uma variação falhar, segue com as outras */
      }
    }
  }

  return rules.join('\n');
}

async function embedImage(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'force-cache' });
  const buf = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') ?? 'image/png';
  return `data:${contentType};base64,${arrayBufferToBase64(buf)}`;
}

export interface PosterAssets {
  display: string; // Anton (SIX, "Peça no bar")
  heading: string; // Oswald (rótulos, tracking largo)
  fontFaceCss: string;
  logoDataUrl: string;
}

/** Carrega e embute as fontes da marca + a logo, prontas pro SVG do cartaz. */
export async function loadPosterAssets(): Promise<PosterAssets> {
  await document.fonts.ready;
  const display = resolveFontFamily('--font-anton') ?? 'Impact';
  const heading = resolveFontFamily('--font-oswald') ?? 'sans-serif';
  const [displayCss, headingCss, logoDataUrl] = await Promise.all([
    embedFontFace(display),
    embedFontFace(heading),
    embedImage('/six-logo.png'),
  ]);
  return { display, heading, fontFaceCss: `${displayCss}\n${headingCss}`, logoDataUrl };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Linhas da frase de efeito — quebradas à mão nos pontos de pontuação natural. */
const TAGLINE_LINES = [
  'Escaneou, escolheu, enviou.',
  'Seu pedido chega ao bar na hora —',
  'e você acompanha tudo pelo celular.',
];

/** Monta o SVG completo do cartaz (mesma composição da tela: logo, frase, QR na anilha, rodapé). */
export function buildPosterSvg(qrPngDataUrl: string, assets: PosterAssets): string {
  const W = 592;
  const H = 840;
  const cx = W / 2;
  const { display, heading, fontFaceCss, logoDataUrl } = assets;

  const taglineSvg = TAGLINE_LINES.map(
    (line, i) =>
      `<text x="${cx}" y="${224 + i * 27}" text-anchor="middle" font-family="${esc(heading)}" font-size="19" fill="#0B0B0A" fill-opacity="0.72">${esc(line)}</text>`,
  ).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>${fontFaceCss}</style>
    <clipPath id="qr-clip"><rect x="0" y="0" width="200" height="200" rx="14" /></clipPath>
  </defs>

  <rect width="${W}" height="${H}" rx="28" fill="#E9DCC3" />

  <!-- Logo (selo oficial SIX Wowness Club) -->
  <image href="${logoDataUrl}" x="${cx - 76}" y="18" width="152" height="152" />

  <rect x="${cx - 24}" y="188" width="48" height="4" rx="2" fill="#B3122F" />

  <!-- Frase -->
  ${taglineSvg}

  <!-- Anilha com o QR -->
  <g transform="translate(${cx}, 515)">
    <circle r="160" fill="#D8C9A8" />
    <circle r="160" fill="none" stroke="#8A5A2B" stroke-opacity="0.35" stroke-width="2.5" />
    <circle r="134" fill="none" stroke="#8A5A2B" stroke-opacity="0.28" stroke-width="1.75" />
    <circle cx="134" cy="0" r="7" fill="#8A5A2B" fill-opacity="0.3" />
    <circle cx="-134" cy="0" r="7" fill="#8A5A2B" fill-opacity="0.3" />
    <circle cx="0" cy="134" r="7" fill="#8A5A2B" fill-opacity="0.3" />
    <circle cx="0" cy="-134" r="7" fill="#8A5A2B" fill-opacity="0.3" />
    <text y="200" text-anchor="middle" font-family="${esc(heading)}" letter-spacing="3.5" font-size="12" fill="#8A5A2B" fill-opacity="0.55">WOWNESS CLUB</text>

    <rect x="-115" y="-115" width="230" height="230" rx="20" fill="#E9DCC3" />
    <g transform="translate(-100, -100)" clip-path="url(#qr-clip)">
      <image href="${qrPngDataUrl}" x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid meet" />
    </g>
  </g>

  <!-- Rodapé -->
  <text x="${cx}" y="716" text-anchor="middle" font-family="${esc(heading)}" letter-spacing="3.5" font-size="12" fill="#0B0B0A" fill-opacity="0.7">APONTE A CÂMERA DO CELULAR</text>

  <line x1="${cx - 42}" y1="742" x2="${cx - 14}" y2="742" stroke="#0B0B0A" stroke-opacity="0.4" />
  <text x="${cx}" y="747" text-anchor="middle" font-size="13" fill="#0B0B0A" fill-opacity="0.4">✦</text>
  <line x1="${cx + 14}" y1="742" x2="${cx + 42}" y2="742" stroke="#0B0B0A" stroke-opacity="0.4" />

  <text x="${cx}" y="772" text-anchor="middle" font-size="14" fill="#0B0B0A" fill-opacity="0.6">@sixhealth.br · @sixwownessbar</text>
</svg>`;
}

/** Rasteriza o SVG do cartaz em PNG (canvas) e devolve a data URL pronta pra baixar. */
export function rasterizePoster(svgMarkup: string, scale = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('canvas indisponível'));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('falha ao rasterizar o SVG'));
    };
    img.src = url;
  });
}
