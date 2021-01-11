import {LitElement} from "lit-element";
import {template} from './foreground-step.html.js';
import {style} from './foreground-step.css.js';
import {style as commonstyle} from '../common/steps.css.js';
import App from '../app/app';
import {svgToImage} from '../utils/image.js';

export default class ForegroundStep extends LitElement {
    static get BlendModes() {
        return [
            { label: 'Multiply', value: 'multiply' },
            { label: 'Screen', value: 'screen' },
            { label: 'Overlay', value: 'overlay' },
            { label: 'Darken', value: 'darken' },
            { label: 'Lighten', value: 'lighten' },
            { label: 'Color Dodge', value: 'color-dodge' },
            { label: 'Color Burn', value: 'color-burn' },
            { label: 'Hard Light', value: 'hard-light' },
            { label: 'Soft Light', value: 'soft-light' },
            { label: 'Difference', value: 'difference' },
            { label: 'Exclusion', value: 'exclusion' },
            { label: 'Hue', value: 'hue' },
            { label: 'Saturation', value: 'saturation' },
            { label: 'Luminosity', value: 'luminosity' },
            { label: 'Color', value: 'color' }];
    }

    constructor() {
        super();

        /**
         * shape type
         */
        this.shapeType = App.DEFAULT_SHAPETYPE;

        /**
         * shape color
         */
        this.shapeColor = App.DEFAULT_SHAPECOLOR;

        /**
         * shape distance
         */
        this.shapeDistance = App.DEFAULT_SHAPEDISTANCE;

        /**
         * blend mode
         */
        this.blendMode = App.DEFAULT_BLENDMODE;

        /**
         * is camera enabled
         */
        this.cameraEnabled = false
    }

    static get styles() {
        return [style, commonstyle];
    }

    randomImage() {
        this.cameraEnabled = false;
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
                layer: 'foreground',
                image: data[parseInt(Math.random() * data.length)]
            },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }

    uploadImage() {
        this.cameraEnabled = false;
        const ce = new CustomEvent('propertychange', {
            detail: {
                action: 'imageupload',
                layer: 'foreground'
            },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }

    chooseShape(e) {
        const ce = new CustomEvent('propertychange', {
            detail: {
                action: 'shapechange',
                shape: e.target.value
            },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }

    chooseColor(e) {
        const ce = new CustomEvent('propertychange', {
            detail: {
                action: 'colorchange',
                color: e.target.value
            },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }

    chooseDistance(e) {
        const ce = new CustomEvent('propertychange', {
            detail: {
                action: 'distancechange',
                distance: e.target.value
            },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }

    chooseBlendMode(e) {
        this.blendMode = e.target.dataset.blend;
        const ce = new CustomEvent('propertychange', {
            detail: {
                action: 'blendchange',
                blend: this.blendMode
            },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
        this.requestUpdate('blendMode');
    }

    useCamera() {
        let ce;
        if (this.cameraEnabled === false) {
            this.cameraEnabled = true;
            ce = new CustomEvent('propertychange', {
                detail: {
                    action: 'imagechange',
                    layer: 'foreground',
                    image: 'camera'
                },
                composed: true, bubbles: true });
        } else {
            // take photo
            this.cameraEnabled = false;
            ce = new CustomEvent('takephoto', { composed: true, bubbles: true });
        }
        this.dispatchEvent(ce);
        this.requestUpdate('cameraEnabled');
    }

    render() {
        return template(this);
    }
}

customElements.define('remix-foreground-step', ForegroundStep);
