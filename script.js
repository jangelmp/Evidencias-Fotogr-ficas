document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');
  const btnCapture = document.getElementById('btnCapture');
  const status = document.getElementById('status');
  const placeholder = document.getElementById('photoPlaceholder');
  const btnDownload = document.getElementById('btnDownload');
  const btnClear = document.getElementById('btnClear');
  const inputAfiliacion = document.getElementById('afiliacion');
  const inputUbicacion = document.getElementById('ubicacion');
  const inputTicket = document.getElementById('ticket');
  const selectPos = document.getElementById('recuadroPos');
  const inputColor = document.getElementById('recuadroColor');
  const inputBrillo = document.getElementById('brillo');
  const inputContraste = document.getElementById('contraste');
  let stream = null;
  let lastImageDataUrl = null;
  inputColor.value = '#ffff00'; 
  inputBrillo.value = 1.2;      
  inputContraste.value = 1.1;   

  async function startCamera() {
    try {
      const constraints = {
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      status.textContent = 'Estado: cámara activa';
      btnStop.disabled = false;
      btnCapture.disabled = false;
      btnStart.disabled = true;
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      status.textContent = 'Error: no se pudo acceder a la cámara.';
      alert('Error al acceder a la cámara. Revisa permisos y usa HTTPS o localhost.');
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
      video.srcObject = null;
      status.textContent = 'Estado: cámara detenida';
      btnStart.disabled = false;
      btnStop.disabled = true;
      btnCapture.disabled = true;
    }
  }
  
  function hexToRgb(hex) {
    const h = hex.replace('#','');
    const bigint = parseInt(h, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }

  function getTextContrastColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    const lum = 0.2126*(r/255) + 0.7152*(g/255) + 0.0722*(b/255);
    return lum > 0.6 ? '#000000' : '#ffffff';
  }

  function fitFontSize(ctx, text, maxWidth, startSize, minSize = 10, fontFamily = 'Arial', bold = true) {
    let size = startSize;
    while (size >= minSize) {
      ctx.font = `${bold ? 'bold ' : ''}${size}px ${fontFamily}`;
      const width = ctx.measureText(text).width;
      if (width <= maxWidth) return size;
      size -= 1;
    }
    return minSize;
  }

  function drawCenteredLines(ctx, lines, boxX, boxY, boxW, boxH, colorHex) {
    const padding = 4; // margen interno
    const maxTextWidth = boxW - padding * 2;
    const initial = lines.length === 3 ? 28 : 32; 
    const sizes = lines.map(line => fitFontSize(ctx, line, maxTextWidth, initial, 12, 'Arial', true));
    const lineHeights = sizes.map(s => Math.round(s * 1.25));
    let totalHeight = lineHeights.reduce((a,b)=>a+b,0);
    const maxTotal = boxH - padding * 2;
    if (totalHeight > maxTotal) {
      const scale = maxTotal / totalHeight;
      for (let i = 0; i < sizes.length; i++) {
        sizes[i] = Math.max(12, Math.floor(sizes[i] * scale));
        lineHeights[i] = Math.round(sizes[i] * 1.25);
      }
      totalHeight = lineHeights.reduce((a,b)=>a+b,0);
    }
    const textColor = getTextContrastColor(colorHex);
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    let currentY = boxY + padding;
    for (let i = 0; i < lines.length; i++) {
      const size = sizes[i];
      ctx.font = `bold ${size}px Arial`;
      currentY += lineHeights[i];
      ctx.fillText(lines[i], boxX + boxW / 2, currentY);
    }
  }

function capturePhoto() {
  if (!stream) return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const margin = video.videoHeight/12; // margen en px
  const drawWidth = video.videoWidth - margin * 2;
  const drawHeight = video.videoHeight - margin * 2;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.save();
  ctx.globalCompositeOperation = "source-over"; 
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const brillo = inputBrillo.value;
  const contraste = inputContraste.value;
  ctx.filter = `brightness(${brillo}) contrast(${contraste})`;
  ctx.drawImage(video, margin, margin, drawWidth, drawHeight);
  ctx.filter = "none";
  const recuadroPos = selectPos.value;
  const recuadroColor = inputColor.value;
  const boxW = canvas.width * 0.28;
  const boxH = canvas.height * 0.17;
  let boxX, boxY;
  console.log("Valor SelectedPos:", recuadroPos)
  switch (recuadroPos) {
    case 'sup-izq': boxX = margin; boxY = margin; break;
    case 'sup-der': boxX = canvas.width - boxW - margin; boxY = margin; break;
    case 'inf-izq': boxX = margin; boxY = canvas.height - boxH - margin; break;
    case 'inf-der': boxX = canvas.width - boxW - margin; boxY = canvas.height - boxH - margin; break;
    default: boxX = margin; boxY = margin;
  }
  ctx.fillStyle = recuadroColor;
  ctx.fillRect(boxX, boxY, boxW, boxH);
  const lines = [
    inputTicket.value || '',
    inputAfiliacion.value || '',
    inputUbicacion.value || ''
  ].filter(l => l.trim() !== '');
  if (lines.length > 0) {
    drawCenteredLines(ctx, lines, boxX, boxY, boxW, boxH, recuadroColor);
  }
  lastImageDataUrl = canvas.toDataURL('image/png');
  placeholder.innerHTML = `<img src="${lastImageDataUrl}" alt="Foto capturada" class="captured-image">`;
  btnDownload.disabled = false;
  btnClear.disabled = false;
}

function generarNombreArchivo() {
  const ahora = new Date();
  const dia = String(ahora.getDate()).padStart(2, '0');
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const hora = String(ahora.getHours()).padStart(2, '0');
  const min = String(ahora.getMinutes()).padStart(2, '0');
  const seg = String(ahora.getSeconds()).padStart(2, '0');
  return `foto_${dia}-${mes}_${hora}-${min}-${seg}.png`;
}

async function guardarFoto() {
  if (!lastImageDataUrl) return;
  const response = await fetch(lastImageDataUrl);
  const blob = await response.blob();
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: generarNombreArchivo(), 
        types: [
          {
            description: "Imagen PNG",
            accept: { "image/png": [".png"] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      console.log("Imagen guardada con File System Access API");
    } catch (err) {
      console.error("El usuario canceló o hubo un error:", err);
    }
  } else {
    const link = document.createElement('a');
    link.href = lastImageDataUrl;
    link.download = generarNombreArchivo();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log("Imagen descargada con método clásico");
  }
}
  function clearPreview() {
    lastImageDataUrl = null;
    placeholder.innerHTML = 'Aún no hay foto';
    btnDownload.disabled = true;
    btnClear.disabled = true;
  }
  function updateVideoFilters() {
    const brillo = inputBrillo.value;
    const contraste = inputContraste.value;
    video.style.filter = `brightness(${brillo}) contrast(${contraste})`;
  }
  inputBrillo.addEventListener('input', updateVideoFilters);
  inputContraste.addEventListener('input', updateVideoFilters);
  btnStart.addEventListener('click', startCamera);
  btnStop.addEventListener('click', stopCamera);
  btnCapture.addEventListener('click', capturePhoto);
  btnClear.addEventListener('click', clearPreview);
  btnDownload.addEventListener('click', guardarFoto);
});