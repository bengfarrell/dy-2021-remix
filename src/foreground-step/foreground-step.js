import {LitElement} from "lit-element";
import {template} from './foreground-step.html.js';
import {style} from './foreground-step.css.js';
import {style as commonstyle} from '../common/steps.css.js';
import EventBus from '../eventbus.js';
import {getAssetImage, getRandomResult} from '../utils/data.js';

export default class ForegroundStep extends LitElement {
    constructor() {
        new EventBus().addEventListener('cameraframe', e => {
            this.currentImage = e.detail;
        });

        super();

        /**
         * current image
         */
        this.currentImage = undefined;

        /**
         * is camera enabled
         */
        this.cameraEnabled = false;
    }

    static get styles() {
        return [style, commonstyle];
    }

    async randomImage() {
        this.cameraEnabled = false;
        const asset = await getRandomResult();
        this.currentImage = getAssetImage(asset);
        this.requestUpdate('currentImage');
        this.sendEvent();
    }

    uploadImage() {
        this.shadowRoot.querySelector('input').click();
    }

    onLocalImage(e) {
        this.currentImage = URL.createObjectURL(e.target.files[0]);
        this.requestUpdate('currentImage');
        this.sendEvent();
    }

    useCamera() {
        let ce;
        if (this.cameraEnabled === false) {
            this.cameraEnabled = true;
            ce = new CustomEvent('propertychange', {
                detail: {
                    action: 'imagechange',
                    layer: 'foreground',
                    image: 'camera'
                },
                composed: true, bubbles: true });
        } else {
            // take photo
            this.cameraEnabled = false;
            ce = new CustomEvent('takephoto', { composed: true, bubbles: true });
        }
        this.dispatchEvent(ce);
        this.requestUpdate('cameraEnabled');
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
                layer: 'foreground',
                image: this.currentImage
            },
            composed: true, bubbles: true });
        this.dispatchEvent(ce);
    }
}

customElements.define('remix-foreground-step', ForegroundStep);
