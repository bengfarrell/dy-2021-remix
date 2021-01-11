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
    <sp-button variant="secondary" @click=${() => scope.randomImage()} >
        <sp-icon size="s" slot="icon">${Shuffle}</sp-icon> Random
    </sp-button>
    <sp-button variant="secondary" @click=${() => scope.uploadImage()} >
        <sp-icon size="s" slot="icon">${Upload}</sp-icon> Upload
    </sp-button>
    <sp-button variant="secondary" @click=${() => scope.useCamera()}>
        <sp-icon size="s" slot="icon">${Camera}</sp-icon> ${scope.cameraEnabled ? 'Snap' : 'Camera'}
    </sp-button>
</div>

<div class="button-row">
    <label>Choose a shape</label>
    <sp-dropdown @change=${(e) => scope.chooseShape(e)} value=${scope.shapeType} label="Choose a shape">
        <sp-menu>
            <sp-menu-item value="hexagons">Hexagon</sp-menu-item>
            <sp-menu-item value="circles">Circle</sp-menu-item>
            <sp-menu-item value="circulardots">Circular Dot</sp-menu-item>
            <sp-menu-item value="sunflowerdots">Sunflower Dot</sp-menu-item>
            <sp-menu-item value="altcircles">Circle 2</sp-menu-item>
            <sp-menu-item value="squares">Square</sp-menu-item>
            <sp-menu-item value="crosses">Cross</sp-menu-item>
            <sp-menu-item value="triangles">Triangle</sp-menu-item>
            <sp-menu-item value="alttriangles">Triangle 2</sp-menu-item>
            <sp-menu-item value="diamonds">Diamond</sp-menu-item>
            <sp-menu-item value="waves">Wave</sp-menu-item>
            <sp-menu-item value="altsquares">Square 2</sp-menu-item>
        </sp-menu>
    </sp-dropdown>
</div>

<div class="button-row">
    <label>Choose a shape color</label>
    <input type="color" @input=${(e) => scope.chooseColor(e)} />
</div>

<div class="button-row">
    <label>Choose a shape distance</label>
    <sp-patched-slider 
        @input=${(e) => scope.chooseDistance(e)} 
        min="5" max="20" step="1" 
        value=${scope.shapeDistance}>
    </sp-patched-slider>
</div>

<label>Blend mode</label>
<div class="button-row" id="blend-modes">
${ForegroundStep.BlendModes.map((blendmode) =>
    html`<sp-action-button 
            data-blend=${blendmode.value} 
            ?selected=${blendmode.value === scope.blendMode}
            @change=${(e) => scope.chooseBlendMode(e)} 
            toggles>${blendmode.label}
    </sp-action-button>`)}
</div>

<div class="navigation-row">
    <sp-button variant="secondary">Back</sp-button>
    <sp-button>Next</sp-button>
</div>
`;}
