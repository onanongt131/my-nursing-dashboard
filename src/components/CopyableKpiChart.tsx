'use client';

import {useRef, useState} from 'react';

async function chartPng(svg: SVGSVGElement, title: string): Promise<Blob> {
  const {width, height} = svg.getBoundingClientRect();
  if (!width || !height) throw new Error('Chart is not visible');
  const snapshot = svg.cloneNode(true) as SVGSVGElement;
  snapshot.setAttribute('width', String(width));
  snapshot.setAttribute('height', String(height));
  snapshot.style.fontFamily = getComputedStyle(svg).fontFamily;
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(snapshot)], {type:'image/svg+xml;charset=utf-8'}));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((width + 24) * 2);
    canvas.height = Math.ceil((height + 52) * 2);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.scale(2, 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width + 24, height + 52);
    ctx.fillStyle = '#134e4a';
    ctx.font = 'bold 16px ' + snapshot.style.fontFamily;
    ctx.fillText(title, 12, 24, width);
    ctx.drawImage(image, 12, 40, width, height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG unavailable')), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function CopyableKpiChart({title}: {title: string}) {
  const button = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function copy() {
    const svg = button.current?.closest('[data-kpi-chart]')?.querySelector<SVGSVGElement>('svg.recharts-surface');
    if (!svg || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      setMessage('เบราว์เซอร์นี้คัดลอกกราฟไม่ได้');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await navigator.clipboard.write([new ClipboardItem({'image/png': chartPng(svg, title)})]);
      setMessage('คัดลอกกราฟแล้ว');
    } catch {
      setMessage('คัดลอกกราฟไม่สำเร็จ กรุณาตรวจสิทธิ์คลิปบอร์ด');
    } finally {
      setBusy(false);
    }
  }

  return <span className="inline-flex shrink-0 items-center">
    <span role="status" className="sr-only">{message}</span>
    <button ref={button} type="button" onClick={copy} disabled={busy}
      aria-label="คัดลอกกราฟ" title={message || 'คัดลอกกราฟ'}
      className="inline-flex size-7 items-center justify-center rounded-md border border-teal-200 text-teal-800 hover:bg-teal-50 disabled:opacity-50">
      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="8" width="12" height="12" rx="2"/>
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>
      </svg>
    </button>
  </span>;
}
