import {LitElement} from "lit-element";
import {template} from './background-step.html.js';
import {style} from './background-step.css.js';
import {style as commonstyle} from '../common/steps.css.js';

export default class BackgroundStep extends LitElement {
    static get styles() {
        return [style, commonstyle];
    }

    constructor() {
        super();

        /**
         * image
         */
        this.currentImage = undefined;
    }

    randomImage() {
        const data = [
            './sampleimages/sample1.jpeg',
            './sampleimages/sample2.jpeg',
            './sampleimages/sample3.jpeg',
            './sampleimages/sample4.jpeg',
            './sampleimages/sample5.jpeg',
            './sampleimages/sample6.jpeg',
            './sampleimages/sample7.jpeg'
        ];

        this.currentImage = data[parseInt(Math.random() * data.length)];
        this.requestUpdate('currentImage');
        this.sendEvent();
    }

    onLocalImage(e) {
        this.currentImage = URL.createObjectURL(e.target.files[0]);
        this.requestUpdate('currentImage');
        this.sendEvent();
    }

    uploadImage() {
        this.shadowRoot.querySelector('input').click();
    }

    render() {
        return template(this);
    }

    navigate(direction) {
        const ce = new CustomEvent('navigate', { detail: direction, composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }

    sendEvent() {
        const ce = new CustomEvent('propertychange', {
            detail: {
                action: 'imagechange',
                layer: 'background',
                image: this.currentImage
            },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }
}

customElements.define('remix-background-step', BackgroundStep);
