/**
 * Visual Export Suite for Atelier Analytics
 * Supports High-Resolution PNG (Retina 2x), Vector SVG, and PDF/Print Reporting
 */

export function exportPlotAsSvg(containerEl: HTMLElement, filename = 'atelier-chart'): void {
  const svgEl = containerEl.querySelector('svg');
  if (!svgEl) {
    console.error('No se encontró elemento SVG para exportar');
    return;
  }

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgEl);

  // Ensure standard namespaces are declared
  if (!svgString.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `${filename}.svg`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}

export function exportPlotAsPng(
  containerEl: HTMLElement,
  filename = 'atelier-chart',
  scale = 2
): Promise<void> {
  return new Promise((resolve, reject) => {
    const svgEl = containerEl.querySelector('svg');
    if (!svgEl) {
      reject(new Error('No se encontró elemento SVG para exportar'));
      return;
    }

    const bbox = svgEl.getBoundingClientRect();
    const width = bbox.width || 800;
    const height = bbox.height || 500;

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgEl);
    if (!svgString.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar contexto 2D del Canvas'));
          return;
        }

        // Fill background based on theme (white or dark slate)
        const isDark = document.documentElement.classList.contains('dark');
        ctx.fillStyle = isDark ? '#0c0a09' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to serialize Canvas to PNG Blob'));
            return;
          }
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `${filename}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
          resolve();
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Error rendering SVG image: ${e}`));
    };

    img.src = url;
  });
}

export function printExecutiveReport(): void {
  window.print();
}
