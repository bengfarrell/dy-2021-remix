import { Slider } from '@spectrum-web-components/slider';
import { html } from 'lit-html';
import { css } from 'lit-element';
import sliderStyles from '@spectrum-web-components/slider/src/slider.css.js';
import spectrumSliderStyles from '@spectrum-web-components/slider/src/spectrum-slider.css.js';

/**
 * slider is patched just to put the label on the right side instead of on top the slider
 */
export default class PatchedSlider extends Slider {
    static get styles() {
        return [sliderStyles, spectrumSliderStyles, css`
        :host {
          display: flex;
          justify-content: center;
        }
        
        #labelContainer {
          line-height: 22px;
        }`];
    }

    render() {
        return html`                
            ${this.variant === 'color'
            ? this.renderColorTrack()
            : this.renderTrack()}
            ${this.renderLabel()}
        `;
    }

    renderLabel() {
        return html`
            <div id="labelContainer">
                <div
                    id="value"
                    role="textbox"
                    aria-readonly="true"
                    aria-labelledby="label"
                >
                    ${this.ariaValueText}
                </div>
            </div>
        `;
    }
}

customElements.define('sp-patched-slider', PatchedSlider);
