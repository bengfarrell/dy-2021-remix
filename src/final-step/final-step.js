import {LitElement} from "lit-element";
import {template} from './final-step.html.js';
import {style} from './final-step.css.js';
import {style as commonstyle} from '../common/steps.css.js';

export default class FinalStep extends LitElement {
    static get styles() {
        return [style, commonstyle];
    }

    saveAs(filetype) {
        const ce = new CustomEvent('save', {
            detail: { filetype },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }

    submit() {
        const firstname = this.shadowRoot.getElementById('firstname').value;
        const lastinitial = this.shadowRoot.getElementById('lastinitial').value;
        const age = this.shadowRoot.getElementById('age').value;
        const ce = new CustomEvent('submit', { detail: { firstname, lastinitial, age },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }

    render() {
        return template(this);
    }

    navigate(direction) {
        const ce = new CustomEvent('navigate', { detail: direction, composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }
}

customElements.define('remix-final-step', FinalStep);
