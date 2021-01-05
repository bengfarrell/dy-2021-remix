import {LitElement} from "lit-element";
import {template} from './layer-chooser.html.js';
import {downloadImage, svgToImage} from '../utils/image.js';
import {style} from "./layer-chooser.css.js";

export default class LayerChooser extends LitElement {
    static get styles() {
        return [style];
    }

    static get properties() {
        return {
            mode: { type: String },
        };
    }

    constructor() {
        super();

        /**
         * background image
         * @type {string} url
         */
        this.backgroundImage = undefined;

        /**
         * foreground image
         * @type {string} url
         */
        this.foregroundImage = '';

        /**
         * background image index
         */
        this.bgImageIndex = -1;

        /**
         * foreground image index
         */
        this.fgImageIndex = -1;

        /**
         * pending upload image type
         */
        this.pendingUploadType = undefined;

        this.data = [
            './sampleimages/sample1.jpeg',
            './sampleimages/sample2.jpeg',
            './sampleimages/sample3.jpeg',
            './sampleimages/sample4.jpeg',
            './sampleimages/sample5.jpeg',
            './sampleimages/sample6.jpeg',
            './sampleimages/sample7.jpeg'
        ];

        // needs to be async because mode isn't an attribute yet
        // however, once this is data connected, the problem will
        // solve itself
        requestAnimationFrame(() => {
            this.nextImage('background');
        })
    }


    nextImage(type) {
        if (type === 'background') {
            this.bgImageIndex ++;
            if (this.bgImageIndex >= this.data.length) {
                this.bgImageIndex = 0;
            }
            this.backgroundImage = this.data[this.bgImageIndex];
        } else {
            this.fgImageIndex ++;
            if (this.fgImageIndex >= this.data.length) {
                this.fgImageIndex = 0;
            }
            this.foregroundImage = this.data[this.fgImageIndex];
        }
        this.requestUpdate();
    }

    uploadImage(type) {
        this.pendingUploadType = type;
        this.shadowRoot.querySelector('input').click();
    }

    async onCameraClick() {
        if (this.foregroundImage === 'camera') {
            this.foregroundImage = await svgToImage(this.shadowRoot.querySelector('halftone-svg'));
        } else {
            this.foregroundImage = 'camera';
        }
        this.requestUpdate();
    }

    onDownloadImage() {
        downloadImage(this.shadowRoot.querySelector('halftone-svg'), this.backgroundImage);
    }

    onLocalImage(e) {
        if (this.pendingUploadType === 'background') {
            this.backgroundImage = URL.createObjectURL(e.target.files[0]);
        } else {
            this.foregroundImage = URL.createObjectURL(e.target.files[0]);
        }
        this.requestUpdate();
    }

    render() {
        return template(this);
    }
}

customElements.define('remix-layer-chooser', LayerChooser);
