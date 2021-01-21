import {LitElement} from "lit-element";
import {template} from './steps.html.js';
import {style} from "./steps.css.js";

export default class Steps extends LitElement {
    static get styles() {
        return [style];
    }

    constructor() {
        super();

        this.addEventListener('navigate', e => {
            if (e.detail === 'next') {
                this.currentStep ++;
            } else {
                this.currentStep --;
            }
            this.requestUpdate('currentStep');
        });

        /**
         * current step index
         */
        this.currentStep = 0;
    }

    updated(_changedProperties) {
        super.updated(_changedProperties);
        this.scrollTo(0, 0);
    }

    render() {
        return template(this);
    }
}

customElements.define('remix-steps', Steps);
