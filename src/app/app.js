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

        this.addEventListener('modechange', (e) => {
            this.mode = e.detail;
            this.requestUpdate('mode');
        });

        /**
         * application mode (background selection, foreground selection, or complete)
         */
        this.mode = 'background';
    }

    onTabChange(e) {
        this.mode = e.target.selected;
        this.requestUpdate('mode');
    }
    render() {
        return template(this);
    }
}

customElements.define('remix-app', App);
