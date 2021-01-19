export const downloadImage = (htComponent, backgroundCanvas, filetype = 'jpg') => {
    let rendered = false;
    const imgA = document.createElement('img');
    let svg64 = btoa(htComponent.getSVG());
    let b64Start = 'data:image/svg+xml;base64,';
    let image64 = b64Start + svg64;

    const composite = () => {
        const canvas = document.createElement('canvas');
        canvas.width = htComponent.contentWidth;
        canvas.height = htComponent.contentHeight;
        const ctx = canvas.getContext('2d');

        ctx.globalCompositeOperation = 'normal';
        if (backgroundCanvas) {
            drawBackgroundImage(ctx, backgroundCanvas);
        }
        ctx.globalCompositeOperation = 'overlay'; //blendMode;
        ctx.drawImage(imgA, 0, 0);
        downloadCanvasAsImage(canvas, filetype);
        rendered = true;
    }

    imgA.onload = () => composite();
    imgA.src = image64;
}

export const svgToImage = (htComponent) => {
    return new Promise(resolve => {
        const img = document.createElement('img');
        let svg64 = btoa(htComponent.getSVG());
        let b64Start = 'data:image/svg+xml;base64,';
        let image64 = b64Start + svg64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = htComponent.contentWidth;
            canvas.height = htComponent.contentHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.src = image64;
    });
}

export const downloadCanvasAsImage = (canvas, filetype) => {
    const imgdata = canvas.toDataURL(`image/${filetype}`);
    const dl = document.createElement('a');
    dl.setAttribute('download', `halftone.${filetype}`);
    dl.setAttribute('href', imgdata);
    dl.click();
}


export const drawBackgroundImage = (ctx, srccanvas, offsetX = 0.5, offsetY = 0.5) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // keep bounds [0.0, 1.0]
    if (offsetX < 0) offsetX = 0;
    if (offsetY < 0) offsetY = 0;
    if (offsetX > 1) offsetX = 1;
    if (offsetY > 1) offsetY = 1;

    var iw = srccanvas.width,
        ih = srccanvas.height,
        r = Math.min(w / iw, h / ih),
        nw = iw * r,   // new prop. width
        nh = ih * r,   // new prop. height
        cx, cy, cw, ch, ar = 1;

    // decide which gap to fill
    if (nw < w) ar = w / nw;
    if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;  // updated
    nw *= ar;
    nh *= ar;

    // calc source rectangle
    cw = iw / (nw / w);
    ch = ih / (nh / h);

    cx = (iw - cw) * offsetX;
    cy = (ih - ch) * offsetY;

    // make sure source rectangle is valid
    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cw > iw) cw = iw;
    if (ch > ih) ch = ih;

    // fill image in dest. rectangle
    ctx.drawImage(srccanvas, cx, cy, cw, ch, 0, 0, w, h);
}
