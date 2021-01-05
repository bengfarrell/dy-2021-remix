import {LitElement} from "lit-element";
import {template} from './app.html.js';
import {style} from "./app.css.js";

// global fix for dropdown popper JS in Spectrum Web Components
window.process = { env : { NODE_ENV: 'nothing' }};

export default class App extends LitElement {
    static get styles() {
        return [style];
    }

    static get properties() {
        return {
            mode: { type: String },
        };
    }

    constructor() {
        super();
    }

    render() {
        return template(this);
    }
}

customElements.define('remix-app', App);
