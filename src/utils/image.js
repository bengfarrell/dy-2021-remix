export const downloadImage = async (htComponent, backgroundCanvas, blendMode, filetype = 'jpg') => {
    const canvas = await compositeImageToCanvas(htComponent, backgroundCanvas, blendMode);
    downloadCanvasAsImage(canvas, filetype);
}

export const downscaleImage = (source, maxWidth) => {
    const destCanvas = document.createElement('canvas');
    const destCtx = destCanvas.getContext("2d");
    const oc = document.createElement('canvas');
    const octx = oc.getContext('2d');

    let width;
    if (maxWidth > source.width) {
        width = maxWidth;
    } else {
        width = source.width;
    }
    destCanvas.width = width; // destination canvas size
    destCanvas.height = destCanvas.width * source.height / source.width;

    var cur = {
        width: Math.floor(source.width * 0.5),
        height: Math.floor(source.height * 0.5)
    }

    oc.width = cur.width;
    oc.height = cur.height;

    octx.drawImage(source, 0, 0, cur.width, cur.height);

    while (cur.width * 0.5 > width) {
        cur = {
            width: Math.floor(cur.width * 0.5),
            height: Math.floor(cur.height * 0.5)
        };
        octx.drawImage(oc, 0, 0, cur.width * 2, cur.height * 2, 0, 0, cur.width, cur.height);
    }

    destCtx.drawImage(oc, 0, 0, cur.width, cur.height, 0, 0, destCanvas.width, destCanvas.height);
    return destCanvas;
}

export const compositeImageToCanvas = async (htComponent, backgroundCanvas, blendMode) => {
    return new Promise( (resolve) => {
        const imgA = document.createElement('img');
        const svg = gatherSVG(htComponent, backgroundCanvas);
        let svg64 = btoa(svg);
        let b64Start = 'data:image/svg+xml;base64,';
        let image64 = b64Start + svg64;

        const composite = () => {
            const scale = backgroundCanvas.width / htComponent.contentWidth;
            const canvas = document.createElement('canvas');
            canvas.width = htComponent.contentWidth * scale;
            canvas.height = htComponent.contentHeight * scale;
            const ctx = canvas.getContext('2d');

            ctx.globalCompositeOperation = 'normal';
            if (backgroundCanvas) {
                drawBackgroundImage(ctx, backgroundCanvas);
            }
            ctx.globalCompositeOperation = blendMode;
            ctx.drawImage(imgA, 0, 0);
            resolve(canvas);
        }

        imgA.onload = () => composite();
        imgA.onerror = (e) => {
            console.log(e)
        }
        imgA.src = image64;
    });
}

const gatherSVG = (htComponent, background) => {
    const scale = background.width / htComponent.contentWidth;
    const naturalScaleWidth = htComponent.visibleRect.width / htComponent.renderer.width;
    const naturalScaleHeight = htComponent.visibleRect.height / htComponent.renderer.height;
    const fill = htComponent.hasAttribute('shapecolor') ? htComponent.getAttribute('shapecolor') : 'black';
    return `<svg xmlns="http://www.w3.org/2000/svg"><g fill="${fill}" transform="scale(${naturalScaleWidth * scale}, ${naturalScaleHeight * scale})">
        <path d="${htComponent.svgPath}"></path>
    </g></svg>`;
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
