import {LitElement} from "lit-element";
import {template} from './background-step.html.js';
import {style} from './background-step.css.js';
import {style as commonstyle} from '../common/steps.css.js';

export default class BackgroundStep extends LitElement {
    static get styles() {
        return [style, commonstyle];
    }

    render() {
        return template(this);
    }
}

customElements.define('remix-background-step', BackgroundStep);
