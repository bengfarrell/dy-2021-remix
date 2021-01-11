import {LitElement} from "lit-element";
import {template} from './background-step.html.js';
import {style} from './background-step.css.js';
import {style as commonstyle} from '../common/steps.css.js';

export default class BackgroundStep extends LitElement {
    static get styles() {
        return [style, commonstyle];
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
        const ce = new CustomEvent('propertychange', {
            detail: {
                action: 'imagechange',
                layer: 'background',
                image: data[parseInt(Math.random() * data.length)]
            },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }

    uploadImage() {
        const ce = new CustomEvent('propertychange', {
            detail: {
                action: 'imageupload',
                layer: 'background'
            },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }

    render() {
        return template(this);
    }
}

customElements.define('remix-background-step', BackgroundStep);
