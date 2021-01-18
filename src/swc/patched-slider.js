import { Slider } from '@spectrum-web-components/slider';
import { html } from 'lit-html';
import { css } from 'lit-element';
import sliderStyles from '@spectrum-web-components/slider/src/slider.css.js';
import spectrumSliderStyles from '@spectrum-web-components/slider/src/spectrum-slider.css.js';

/**
 * slider is patched for a color picker. No label and solid fill colored thumb
 */
export default class PatchedSlider extends Slider {
    static get styles() {
        return [sliderStyles, spectrumSliderStyles, css`
          #handle {
            border-color: white;
            background-color: #1473E6;
          }
          
          :host([dragging]) #handle {
            border-color: #1473E6;
            background-color: white;
          }  
          
          .track {
            display: none;
          }`];
    }

    render() {
        return html`
            ${this.renderTrack()}
        `;
    }
}

customElements.define('sp-patched-slider', PatchedSlider);
