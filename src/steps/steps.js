import {LitElement} from "lit-element";
import {template} from './steps.html.js';
import {style} from "./steps.css.js";

export default class Steps extends LitElement {
    static get styles() {
        return [style];
    }

    render() {
        return template(this);
    }
}

customElements.define('remix-steps', Steps);
