import {LitElement} from "lit-element";
import {template} from './foreground-step.html.js';
import {style} from './foreground-step.css.js';
import {style as commonstyle} from '../common/steps.css.js';

export default class ForegroundStep extends LitElement {
    static get BlendModes() {
        return [ 'Multiply', 'Screen', 'Overlay', 'Darken', 'Lighten', 'Color Dodge', 'Color Dodge',
            'Color Burn', 'Hard Light', 'Soft Light', 'Difference', 'Exclusion', 'Hue', 'Saturation', 'Color'];
    }

    static get styles() {
        return [style, commonstyle];
    }

    render() {
        return template(this);
    }
}

customElements.define('remix-foreground-step', ForegroundStep);
