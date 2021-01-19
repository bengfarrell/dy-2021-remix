import {LitElement} from "lit-element";
import {template} from './background-step.html.js';
import {style} from './background-step.css.js';
import {style as commonstyle} from '../common/steps.css.js';
import {getAssetImage, getRandomResult} from '../utils/data.js';

export default class BackgroundStep extends LitElement {
    static get styles() {
        return [style, commonstyle];
    }

    constructor() {
        super();

        /**
         * image
         */
        this.currentImage = undefined;

        /**
         * backgroundParamUsed
         * has the background GET param been used? We only want it to set the image on inital load
         */
        this.backgroundParamUsed = false;
    }

    updated(changedProperties) {
        const params = new URLSearchParams(document.location.href.split('?')[1] );
        if (params.has('background') && !this.backgroundParamUsed) {
            this.currentImage = params.get('background');
            this.backgroundParamUsed = true;
            this.requestUpdate('currentImage');
            this.sendEvent();
        }
    }

    async randomImage() {
        const asset = await getRandomResult();
        this.currentImage = getAssetImage(asset);
        this.requestUpdate('currentImage');
        this.sendEvent(asset);
    }

    onLocalImage(e) {
        this.currentImage = URL.createObjectURL(e.target.files[0]);
        this.requestUpdate('currentImage');
        this.sendEvent();
    }

    uploadImage() {
        this.shadowRoot.querySelector('input').click();
    }

    render() {
        return template(this);
    }

    navigate(direction) {
        const ce = new CustomEvent('navigate', { detail: direction, composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }

    sendEvent() {
        const ce = new CustomEvent('propertychange', {
            detail: {
                action: 'imagechange',
                layer: 'background',
                image: this.currentImage
            },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }
}

customElements.define('remix-background-step', BackgroundStep);
