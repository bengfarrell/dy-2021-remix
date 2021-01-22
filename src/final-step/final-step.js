import {LitElement} from "lit-element";
import {template} from './final-step.html.js';
import {style} from './final-step.css.js';
import {style as commonstyle} from '../common/steps.css.js';
import EventBus from '../eventbus.js';

export default class FinalStep extends LitElement {
    static get styles() {
        return [style, commonstyle];
    }

    static get properties() {
        return {
            submitted: {type: Boolean},
        };
    }

    constructor() {
        super();
        new EventBus().addEventListener('uploadfailed', () => {
            this.submitted = false;
        })
    }

    saveAs(filetype) {
        const ce = new CustomEvent('save', {
            detail: { filetype },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }

    submit() {
        this.submitted = true;
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
