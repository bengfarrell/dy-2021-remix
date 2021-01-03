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
         * image index
         */
        this.imageIndex = 0;

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
            this.nextImage();
        })
    }


    nextImage() {
        this.imageIndex ++;
        if (this.imageIndex >= this.data.length) {
            this.imageIndex = 0;
        }
        if (this.mode === 'background') {
            this.backgroundImage = this.data[this.imageIndex];
        } else {
            this.foregroundImage = this.data[this.imageIndex];
        }
        this.requestUpdate();
    }

    uploadImage() {
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
        if (this.mode === 'background') {
            this.backgroundImage = URL.createObjectURL(e.target.files[0]);
        } else {
            this.foregroundImage = URL.createObjectURL(e.target.files[0]);
        }
        this.requestUpdate();
    }

    nextStep() {
        switch (this.mode) {
            case 'background':
                this.imageIndex = 0;
                this.mode = 'foreground';
                this.nextImage();
                break;


            case 'foreground':
                this.mode = 'complete';
                break;

            case 'complete':
                this.mode = 'background';
                break;
        }

        const ce = new CustomEvent('modechange', { detail: this.mode, composed: true, bubbles: true });
        this.dispatchEvent(ce);
        this.requestUpdate();
    }

    render() {
        return template(this);
    }
}

customElements.define('remix-layer-chooser', LayerChooser);
