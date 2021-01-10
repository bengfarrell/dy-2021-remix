import {html} from 'lit-html';
import ForegroundStep from './foreground-step.js';
import '@spectrum-web-components/button/sp-button';
import '@spectrum-web-components/button/sp-action-button';
import '@spectrum-web-components/dropdown/sp-dropdown';
import '@spectrum-web-components/menu/sp-menu';
import '@spectrum-web-components/menu/sp-menu-item';
import '@spectrum-web-components/icon/sp-icon';
import PatchedSlider from '../swc/patched-slider.js';
import { Shuffle, Upload, Camera } from '../icons.js';

export const template = function(scope) { return html`

<div class="header">
    <h2>Step 2</h2>
    <span>Choose a foreground image</span>
</div>

<label>Choose an image</label>
<div class="button-row">
    <sp-button variant="secondary"><sp-icon size="s" slot="icon">${Shuffle}</sp-icon> Random</sp-button>
    <sp-button variant="secondary"><sp-icon size="s" slot="icon">${Upload}</sp-icon> Upload</sp-button>
    <sp-button variant="secondary"><sp-icon size="s" slot="icon">${Camera}</sp-icon> Camera</sp-button>
</div>

<div class="button-row">
    <label>Choose a shape</label>
    <sp-dropdown label="Choose a shape">
        <sp-menu>
            <sp-menu-item>Circle</sp-menu-item>
            <sp-menu-item>Triangle</sp-menu-item>
            <sp-menu-item>Square</sp-menu-item>
            <sp-menu-item>Hexagon</sp-menu-item>
        </sp-menu>
    </sp-dropdown>
</div>

<div class="button-row">
    <label>Choose a shape color</label>
    <input type="color" />
</div>

<div class="button-row">
    <label>Choose a shape distance</label>
    <sp-patched-slider></sp-patched-slider>
</div>

<label>Blend mode</label>
<div class="button-row" id="blend-modes">
${ForegroundStep.BlendModes.map((blendmode) =>
    html`<sp-action-button toggles>${blendmode}</sp-action-button>`)}
</div>

<div class="navigation-row">
    <sp-button variant="secondary">Back</sp-button>
    <sp-button>Next</sp-button>
</div>
`;}
