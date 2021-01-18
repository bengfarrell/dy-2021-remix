import {html} from 'lit-html';
import SettingsStep from './settings-step.js';
import '@spectrum-web-components/button/sp-button';
import '@spectrum-web-components/action-button/sp-action-button';
import '@spectrum-web-components/action-group/sp-action-group';
import '@spectrum-web-components/icon/sp-icon';
import '@spectrum-web-components/slider/sp-slider';
import '@spectrum-web-components/field-label/sp-field-label';
import PatchedSlider from '../swc/patched-slider.js';
import {
    PaintPalette,
    ShapeCircle,
    ShapeHexagon,
    ShapeSpiral,
    ShapeSunflower,
    ShapeTwoCircles,
    ShapeTwoTriangles,
    ShapeSquare,
    ShapeCross,
    ShapeTriangle,
    ShapeDiamond, ShapeWaves, ShapeTwoSquares,
} from '../icons.js';

export const template = function(scope) { return html`            
<div class="header">
    <div class="preview illustrated">${PaintPalette}</div>
    <div>
        <h2>Step 3</h2>
        <span>Customize the final look!</span>
    </div>
</div>

<sp-field-label size="l">Choose a pattern</sp-field-label>
<div class="button-row shapes">
    <button class="shape" ?selected="${scope.shapeType === 'circles'}" data-shape="circles" @click="${(e) => scope.chooseShape(e)}">${ShapeCircle}</button>
    <button class="shape" ?selected="${scope.shapeType === 'altcircles'}" data-shape="altcircles" @click="${(e) => scope.chooseShape(e)}">${ShapeTwoCircles}</button>
    <button class="shape" ?selected="${scope.shapeType === 'hexagons'}" data-shape="hexagons" @click="${(e) => scope.chooseShape(e)}">${ShapeHexagon}</button>
    <button class="shape" ?selected="${scope.shapeType === 'circulardots'}" data-shape="circulardots" @click="${(e) => scope.chooseShape(e)}">${ShapeSpiral}</button>
    <button class="shape" ?selected="${scope.shapeType === 'sunflowerdots'}" data-shape="sunflowerdots" @click="${(e) => scope.chooseShape(e)}">${ShapeSunflower}</button>
    <button class="shape" ?selected="${scope.shapeType === 'squares'}" data-shape="squares" @click="${(e) => scope.chooseShape(e)}">${ShapeSquare}</button>
    <button class="shape" ?selected="${scope.shapeType === 'crosses'}" data-shape="crosses" @click="${(e) => scope.chooseShape(e)}">${ShapeCross}</button>
    <button class="shape" ?selected="${scope.shapeType === 'triangles'}" data-shape="triangles" @click="${(e) => scope.chooseShape(e)}">${ShapeTriangle}</button>
    <button class="shape" ?selected="${scope.shapeType === 'alttriangles'}" data-shape="alttriangles" @click="${(e) => scope.chooseShape(e)}">${ShapeTwoTriangles}</button>
    <button class="shape" ?selected="${scope.shapeType === 'diamonds'}" data-shape="diamonds" @click="${(e) => scope.chooseShape(e)}">${ShapeDiamond}</button>
    <button class="shape" ?selected="${scope.shapeType === 'waves'}" data-shape="waves" @click="${(e) => scope.chooseShape(e)}">${ShapeWaves}</button>
    <button class="shape" ?selected="${scope.shapeType === 'altsquares'}" data-shape="altsquares" @click="${(e) => scope.chooseShape(e)}">${ShapeTwoSquares}</button>
</div>

<div class="button-row">
    <sp-slider
            @input=${(e) => scope.chooseDistance(e)}
            min="5" max="20" step="1"
            value=${scope.shapeDistance}><sp-field-label size="l">Choose pattern size</sp-field-label></sp-slider>
</div>

<sp-field-label size="l">Choose pattern color</sp-field-label>
<div class="button-row">
    <sp-patched-slider
        @input=${(e) => scope.chooseColor(e)}
        min="0" max="100" step=".1"
        value=${scope.shapeColorSliderValue}></sp-patched-slider>
</div>

<sp-field-label size="l">Select a style</sp-field-label>
<div class="button-row" id="blend-modes">
    <sp-action-group emphasized selects="single" @change=${(e) => scope.chooseBlendMode(e)} >
${SettingsStep.BlendModes.map((blendmode, index) =>
    html`<sp-action-button 
            value=${blendmode.value}
            ?selected=${blendmode.value === scope.blendMode}>${index+1}</sp-action-button>`)}
    </sp-action-group>
</div>

<div class="navigation-row">
    <sp-button variant="secondary" @click=${() => scope.navigate('back')}>Back</sp-button>
    <sp-button @click=${() => scope.navigate('next')}>Next</sp-button>
</div>
`;}
