/** Автономная сборка многостраничного PDF 1.4 из HD-JPEG страниц (без внешних библиотек). */

const encoder = new TextEncoder();

const A4_W = 595.28;
const A4_H = 841.89;

/**
 * Собирает PDF-документ из массива страниц:
 * @param {Array<{ jpegBytes: Uint8Array, widthPx: number, heightPx: number }>} pages
 * @returns {Blob}
 */
export function buildPdfFromJpegPages(pages) {
  if (!Array.isArray(pages) || !pages.length) {
    throw new Error('Нет страниц для экспорта в PDF');
  }

  const objects = [];
  const pushObj = (id, bodyParts) => {
    objects.push({ id, bodyParts });
  };

  // Obj 1: Catalog, Obj 2: Pages root (заполняются после расчёта ID)
  const pageIds = [];
  let nextId = 3;

  pages.forEach((p, idx) => {
    const imId = nextId++;
    const csId = nextId++;
    const pgId = nextId++;
    pageIds.push(pgId);

    const imgW = Math.max(1, Math.round(p.widthPx));
    const imgH = Math.max(1, Math.round(p.heightPx));
    const landscape = imgW > imgH;
    const pageW = landscape ? A4_H : A4_W;
    const pageH = landscape ? A4_W : A4_H;
    const margin = 16;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const scale = Math.min(maxW / imgW, maxH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const ox = (pageW - drawW) * 0.5;
    const oy = (pageH - drawH) * 0.5;

    const imName = `Im${idx + 1}`;
    const imHeader =
      `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpegBytes.length} >>\nstream\n`;
    const imFooter = `\nendstream`;

    pushObj(imId, [encoder.encode(imHeader), p.jpegBytes, encoder.encode(imFooter)]);

    const cmd = `q ${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${ox.toFixed(2)} ${oy.toFixed(2)} cm /${imName} Do Q`;
    const csBody = `<< /Length ${cmd.length} >>\nstream\n${cmd}\nendstream`;
    pushObj(csId, [encoder.encode(csBody)]);

    const pgBody =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] ` +
      `/Resources << /XObject << /${imName} ${imId} 0 R >> >> /Contents ${csId} 0 R >>`;
    pushObj(pgId, [encoder.encode(pgBody)]);
  });

  const allObjects = [
    { id: 1, bodyParts: [encoder.encode('<< /Type /Catalog /Pages 2 0 R >>')] },
    {
      id: 2,
      bodyParts: [encoder.encode(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`)],
    },
    ...objects,
  ].sort((a, b) => a.id - b.id);

  const chunks = [];
  const header = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]);
  chunks.push(header);

  let offset = header.length;
  const offsets = [0];

  for (const obj of allObjects) {
    offsets[obj.id] = offset;
    const prefix = encoder.encode(`${obj.id} 0 obj\n`);
    const suffix = encoder.encode('\nendobj\n');
    chunks.push(prefix);
    offset += prefix.length;
    for (const part of obj.bodyParts) {
      chunks.push(part);
      offset += part.length;
    }
    chunks.push(suffix);
    offset += suffix.length;
  }

  const xrefStart = offset;
  let xrefStr = `xref\n0 ${allObjects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= allObjects.length; i++) {
    xrefStr += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  const trailerStr =
    `trailer\n<< /Size ${allObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  chunks.push(encoder.encode(xrefStr + trailerStr));
  return new Blob(chunks, { type: 'application/pdf' });
}
