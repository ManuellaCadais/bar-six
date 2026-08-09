'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Wordmark } from '@/components/brand';

const QR_OPTS = {
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  color: { dark: '#0B0B0A', light: '#E9DCC3' },
};

export function QrGenerator({ defaultUrl }: { defaultUrl: string }) {
  const [url, setUrl] = useState(defaultUrl);
  const [svg, setSvg] = useState('');
  const [png, setPng] = useState('');

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
    a.download = 'six-qr.svg';
    a.click();
    URL.revokeObjectURL(href);
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
          <button className="btn-primary px-5 py-2.5 text-xs" onClick={() => window.print()}>
            Imprimir (A5)
          </button>
          <a
            className="btn-ghost px-5 py-2.5 text-xs"
            href={png || undefined}
            download="six-qr.png"
            aria-disabled={!png}
          >
            Baixar PNG
          </a>
          <button className="btn-ghost px-5 py-2.5 text-xs" onClick={downloadSvg} disabled={!svg}>
            Baixar SVG
          </button>
        </div>

        <div className="hairline my-8" />
        <p className="eyebrow text-[0.6rem] mb-3">Prévia da impressão</p>
      </div>

      {/* Folha imprimível */}
      <div className="print-sheet mx-auto flex aspect-[148/210] w-full max-w-md flex-col items-center justify-between rounded-2xl bg-cream px-8 py-10 text-ink shadow-soft">
        <div className="text-center text-ink">
          <Wordmark className="text-[2rem]" />
          <p className="mt-3 text-[0.6rem] uppercase tracking-[0.34em] text-ink/60">
            Wowness Club
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="w-56 max-w-[70%] [&>svg]:h-full [&>svg]:w-full"
            aria-label="QR Code do cardápio"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="mt-5 max-w-[16rem] text-center font-heading text-sm uppercase tracking-[0.2em] text-ink/80">
            Aponte a câmera e faça seu pedido
          </p>
        </div>

        <div className="text-center">
          <div className="mx-auto mb-3 flex items-center gap-2 text-ink/40" aria-hidden>
            <span className="h-px w-8 bg-current" />
            <span className="text-xs">✦</span>
            <span className="h-px w-8 bg-current" />
          </div>
          <p className="text-xs text-ink/60">@sixhealth.br · @sixwownessbar</p>
        </div>
      </div>
    </div>
  );
}
