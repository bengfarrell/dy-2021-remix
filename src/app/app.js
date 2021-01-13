import {LitElement} from "lit-element";
import {template} from './app.html.js';
import {style} from "./app.css.js";
import {downloadImage, svgToImage} from '../utils/image.js';

// global fix for dropdown popper JS in Spectrum Web Components
window.process = { env : { NODE_ENV: 'nothing' }};

export default class App extends LitElement {
    static get DEFAULT_SHAPECOLOR() { return '#000000'; }
    static get DEFAULT_SHAPETYPE() { return 'hexagons'; }
    static get DEFAULT_SHAPEDISTANCE() { return 10; }
    static get DEFAULT_BLENDMODE() { return 'overlay'; }

    static get styles() {
        return [style];
    }

    constructor() {
        super();
        this.addEventListener('propertychange', (event) => this.onPropertyChange(event));
        this.addEventListener('save', (event) => this.onSaveImage(event));
        this.addEventListener('takephoto',() => this.takePhoto());

        /**
         * background image
         */
        this.backgroundImage = undefined;

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
    }

    render() {
        return template(this);
    }

    onSaveImage(event) {
        downloadImage(
            this.shadowRoot.querySelector('halftone-svg'),
            this.backgroundImage,
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
        this.requestUpdate('foregroundImage');
    }

    onPropertyChange(event) {
        switch (event.detail.action) {
            case 'imagechange':
                if (event.detail.layer === 'background') {
                    this.backgroundImage = event.detail.image;
                    this.requestUpdate('backgroundImage');
                } else {
                    this.foregroundImage = event.detail.image;
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
                this.shapeDistance = event.detail.distance;
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
