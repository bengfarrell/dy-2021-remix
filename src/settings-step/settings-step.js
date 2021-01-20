import {LitElement} from "lit-element";
import {template} from './settings-step.html.js';
import {style} from './settings-step.css.js';
import {style as commonstyle} from '../common/steps.css.js';
import App from '../app/app';
import Color from './color.js';

export default class SettingsStep extends LitElement {
    static get BlendModes() {
        return [
            { label: 'Multiply', value: 'multiply' },
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
         * shape color slider value
         */
        const rgb = Color.hexToRGB(App.DEFAULT_SHAPECOLOR);
        this.shapeColorSliderValue = 100 - Color.RGBtoHSV(rgb.r, rgb.b, rgb.g).h * 100;

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
        this.cameraEnabled = false;
    }

    static get styles() {
        return [style, commonstyle];
    }

    chooseShape(e) {
        this.shapeType = e.currentTarget.dataset.shape;
        const ce = new CustomEvent('propertychange', {
            detail: {
                action: 'shapechange',
                shape: e.currentTarget.dataset.shape
            },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
        this.requestUpdate('shapeType');
    }

    chooseColor(e) {
        const rgb = Color.HSVtoRGB(e.target.value / 100, 1, 1);
        const hex = Color.RGBtoHex(rgb);
        const ce = new CustomEvent('propertychange', {
            detail: {
                action: 'colorchange',
                color: hex
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
        this.blendMode = e.currentTarget.selected[0];
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
