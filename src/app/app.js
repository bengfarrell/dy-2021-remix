import {LitElement} from "lit-element";
import {template} from './app.html.js';
import {style} from "./app.css.js";
import {downloadImage, svgToImage} from '../utils/image.js';
import EventBus from '../eventbus.js';

// global fix for dropdown popper JS in Spectrum Web Components
window.process = { env : { NODE_ENV: 'nothing' }};

export default class App extends LitElement {
    static get DEFAULT_SHAPECOLOR() { return '#00FF00'; }
    static get DEFAULT_SHAPETYPE() { return 'hexagons'; }
    static get DEFAULT_SHAPEDISTANCE() { return 10; }
    static get DEFAULT_BLENDMODE() { return 'overlay'; }

    static get styles() {
        return [style];
    }

    constructor() {
        super();
        console.log('build 5');
        this.addEventListener('propertychange', (event) => this.onPropertyChange(event));
        this.addEventListener('save', (event) => this.onSaveImage(event));
        this.addEventListener('takephoto',() => this.takePhoto());

        /**
         * background image
         */
        this.backgroundImage = undefined;

        /**
         * background canvas - we need to immediately capture the bg to a canvas
         * to avoid CORS issues
         */
        this.backgroundCanvas = document.createElement('canvas');

        /**
         * background canvas context
         */
        this.backgroundCanvasCtx = undefined;

        /**
         * background image
         */
        this.foregroundImage = '';

        /**
         * shape type
         */
        this.shapeType = App.DEFAULT_SHAPETYPE;

        /**
         * shape color
         */
        this.shapeColor = App.DEFAULT_SHAPECOLOR;

        /**
         * shape color
         */
        this.shapeDistance = App.DEFAULT_SHAPEDISTANCE;

        /**
         * shape color
         */
        this.blendMode = App.DEFAULT_BLENDMODE;

        /**
         * foreground pixel density used to normalize the shape distance slider
         */
        this.foregroundPixelDensity = undefined;
    }

    render() {
        return template(this);
    }

    onSaveImage(event) {
        downloadImage(
            this.shadowRoot.querySelector('halftone-svg'),
            this.backgroundCanvas,
            event.detail.filetype);
    }

    takePhoto() {
        const halftone = this.shadowRoot.querySelector('halftone-svg');
        const videoEl = halftone.inputSource;
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const imgdata = canvas.toDataURL(`image/jpg`);
        this.foregroundImage = imgdata;

        new EventBus().dispatchEvent(new CustomEvent('cameraframe', { detail: imgdata }));

        this.requestUpdate('foregroundImage');
    }

    onPropertyChange(event) {
        switch (event.detail.action) {
            case 'imagechange':
                if (event.detail.layer === 'background') {
                    // weird issue: getting CORS issues with setting img.crossOrigin elsewhere
                    // unsure how to track this down, but my theory of just spreading the URL around the
                    // app, and then blitting it to canvas later is proving bad
                    // So thinking here, is to immediately capture the incoming background to a canvas and
                    // save ref for downloading/uploading on last step
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        this.backgroundCanvas.width = img.naturalWidth;
                        this.backgroundCanvas.height = img.naturalHeight;
                        this.backgroundCanvasCtx = this.backgroundCanvas.getContext('2d');
                        this.backgroundCanvasCtx.drawImage(img, 0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
                    }
                    img.src = event.detail.image;

                    this.backgroundImage = event.detail.image;
                    this.requestUpdate('backgroundImage');
                } else {
                    this.foregroundImage = event.detail.image;
                    const img = new Image();
                    img.onload = () => {
                        this.foregroundPixelDensity = (640 * 480) / (img.width * img.height);
                    }
                    img.src = this.foregroundImage;
                    this.requestUpdate('foregroundImage');
                }
                break;

            case 'shapechange':
                this.shapeType = event.detail.shape;
                this.requestUpdate('shapeType');
                break;

            case 'colorchange':
                this.shapeColor = event.detail.color;
                this.requestUpdate('shapeColor');
                break;

            case 'distancechange':
                //console.log(event.detail.distance * this.foregroundPixelDensity)
                this.shapeDistance = event.detail.distance; // * this.foregroundPixelDensity;
                this.requestUpdate('shapeDistance');
                break;

            case 'blendchange':
                this.blendMode = event.detail.blend;
                this.requestUpdate('blendMode');
                break;
        }
    }
}

customElements.define('remix-app', App);
