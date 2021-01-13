import {LitElement} from "lit-element";
import {template} from './settings-step.html.js';
import {style} from './settings-step.css.js';
import {style as commonstyle} from '../common/steps.css.js';
import App from '../app/app';

export default class SettingsStep extends LitElement {
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

    render() {
        return template(this);
    }

    navigate(direction) {
        const ce = new CustomEvent('navigate', { detail: direction, composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }
}

customElements.define('remix-settings-step', SettingsStep);
