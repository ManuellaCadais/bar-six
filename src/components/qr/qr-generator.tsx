'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { loadPosterAssets, buildPosterSvg, rasterizePoster, type PosterAssets } from '@/lib/poster';

const TAGLINE = 'Escaneou, escolheu, enviou. Seu pedido chega ao bar na hora — e você acompanha tudo pelo celular.';

const QR_OPTS = {
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  color: { dark: '#0B0B0A', light: '#E9DCC3' },
};

/**
 * Moldura em formato de anilha (disco de peso) atrás do QR — o mesmo
 * apoio circular onde os copos SIX ficam nas fotos de referência.
 * Desenhada em SVG (preenchimento vetorial) para imprimir corretamente
 * mesmo sem a opção "Imagens de fundo" ativada no diálogo de impressão.
 */
function PlateFrame({ children }: { children: React.ReactNode }) {
  return (
    // Grid de célula única: o círculo e o cartão do QR ocupam a MESMA área,
    // e o wrapper tem o tamanho explícito do círculo — assim o espaço que
    // ele ocupa no layout é contado certinho (nada de `absolute` "vazando").
    <div className="grid h-[15.5rem] w-[15.5rem] place-items-center sm:h-64 sm:w-64">
      <svg viewBox="0 0 300 300" className="pointer-events-none col-start-1 row-start-1 h-full w-full" aria-hidden>
        <circle cx="150" cy="150" r="146" fill="#D8C9A8" />
        <circle cx="150" cy="150" r="146" fill="none" stroke="#8A5A2B" strokeOpacity="0.35" strokeWidth="2" />
        <circle cx="150" cy="150" r="122" fill="none" stroke="#8A5A2B" strokeOpacity="0.28" strokeWidth="1.5" />
        {[0, 90, 180, 270].map((deg) => (
          <circle
            key={deg}
            cx={150 + 122 * Math.cos((deg * Math.PI) / 180)}
            cy={150 + 122 * Math.sin((deg * Math.PI) / 180)}
            r="6"
            fill="#8A5A2B"
            fillOpacity="0.3"
          />
        ))}
        <text
          x="150"
          y="252"
          textAnchor="middle"
          fontSize="11"
          letterSpacing="3"
          fill="#8A5A2B"
          fillOpacity="0.55"
          style={{ fontFamily: 'var(--font-oswald), sans-serif', textTransform: 'uppercase' }}
        >
          Wowness Club
        </text>
      </svg>
      <div className="relative col-start-1 row-start-1 rounded-2xl bg-cream p-4 shadow-plate sm:p-5">
        {children}
      </div>
    </div>
  );
}

export function QrGenerator({ defaultUrl }: { defaultUrl: string }) {
  const [url, setUrl] = useState(defaultUrl);
  const [svg, setSvg] = useState('');
  const [png, setPng] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [assets, setAssets] = useState<PosterAssets | null>(null);

  // Pré-carrega e embute fontes + logo assim que a página abre — assim o
  // primeiro clique em "Baixar cartaz" já sai rápido.
  useEffect(() => {
    loadPosterAssets()
      .then(setAssets)
      .catch(() => {
        /* se falhar, downloadPoster tenta carregar de novo na hora do clique */
      });
  }, []);

  useEffect(() => {
    const target = url.trim() || defaultUrl;
    let cancelled = false;
    (async () => {
      try {
        const [svgStr, pngUrl] = await Promise.all([
          QRCode.toString(target, { ...QR_OPTS, type: 'svg', width: 1024 }),
          QRCode.toDataURL(target, { ...QR_OPTS, width: 1024 }),
        ]);
        if (!cancelled) {
          setSvg(svgStr);
          setPng(pngUrl);
        }
      } catch {
        if (!cancelled) {
          setSvg('');
          setPng('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, defaultUrl]);

  function downloadSvg() {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = 'six-qr-codigo.svg';
    a.click();
    URL.revokeObjectURL(href);
  }

  /** Exporta o cartaz inteiro (layout + QR) como PNG em alta resolução. */
  async function downloadPoster() {
    if (!png) return;
    setExporting(true);
    setExportError(null);
    try {
      const activeAssets = assets ?? (await loadPosterAssets());
      if (!assets) setAssets(activeAssets);
      const markup = buildPosterSvg(png, activeAssets);
      const dataUrl = await rasterizePoster(markup, 3);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'six-bar-cartaz.png';
      a.click();
    } catch {
      setExportError('Não foi possível gerar o cartaz. Tente de novo ou use "Imprimir".');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Controles (não imprimem) */}
      <div className="no-print">
        <h1 className="font-heading text-2xl uppercase tracking-wide">
          Gerador de QR Code
        </h1>
        <p className="mt-1 text-sm text-text-mid">
          Aponta para a URL de produção. Imprima em A5 e espalhe nos tablets e
          pontos da academia.
        </p>

        <div className="mt-4">
          <label className="field-label" htmlFor="qr-url">
            URL do cardápio
          </label>
          <input
            id="qr-url"
            className="field-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn-primary px-5 py-2.5 text-xs"
            onClick={downloadPoster}
            disabled={exporting}
          >
            {exporting ? 'Gerando…' : 'Baixar cartaz (PNG)'}
          </button>
          <button className="btn-ghost px-5 py-2.5 text-xs" onClick={() => window.print()}>
            Imprimir (A5)
          </button>
        </div>

        {exportError && <p className="mt-2 text-sm text-strawberry">{exportError}</p>}

        <p className="mt-3 text-xs text-text-low">
          "Baixar cartaz" gera a folha inteira (com o layout) como imagem — ideal
          pra mandar pra gráfica ou compartilhar digitalmente.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            className="btn-ghost px-4 py-2 text-xs"
            href={png || undefined}
            download="six-qr-codigo.png"
            aria-disabled={!png}
          >
            Baixar só o QR (PNG)
          </a>
          <button className="btn-ghost px-4 py-2 text-xs" onClick={downloadSvg} disabled={!svg}>
            Baixar só o QR (SVG)
          </button>
        </div>

        <div className="hairline my-8" />
        <p className="eyebrow text-[0.6rem] mb-3">Prévia da impressão</p>
      </div>

      {/* Folha imprimível / exportável */}
      <div className="print-sheet mx-auto flex aspect-[148/210] w-full max-w-md flex-col items-center justify-between rounded-2xl bg-cream px-8 py-9 text-ink shadow-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/six-logo.png"
          alt="SIX Wowness Club"
          className="h-[4.75rem] w-[4.75rem] object-contain drop-shadow-sm sm:h-24 sm:w-24"
        />

        <div className="text-center">
          <span className="mx-auto mb-3 block h-1 w-12 rounded-full bg-hibiscus" aria-hidden />
          <p className="mx-auto max-w-[16rem] text-[0.95rem] leading-relaxed text-ink/75">
            {TAGLINE}
          </p>
        </div>

        <PlateFrame>
          <div
            className="w-40 sm:w-44 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
            aria-label="QR Code do cardápio"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </PlateFrame>

        <div className="text-center">
          <p className="font-heading text-xs uppercase tracking-[0.24em] text-ink/70">
            Aponte a câmera do celular
          </p>
          <div className="mx-auto my-3 flex items-center gap-2 text-ink/40" aria-hidden>
            <span className="h-px w-8 bg-current" />
            <span className="text-xs">✦</span>
            <span className="h-px w-8 bg-current" />
          </div>
          <p className="text-xs text-ink/60">@sixhealth.br · @sixwownessbar</p>
        </div>
      </div>

      <p className="no-print mx-auto mt-4 max-w-md text-center text-xs text-text-low">
        Dica: no diálogo de impressão, ative a opção <strong>"Imagens de fundo"</strong>{' '}
        (ou "Background graphics") para a folha sair com as cores certas.
      </p>
    </div>
  );
}
