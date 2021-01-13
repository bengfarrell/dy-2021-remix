import {html} from 'lit-html';
import ForegroundStep from './foreground-step.js';
import '@spectrum-web-components/button/sp-action-button';
import { Shuffle, Upload, Camera } from '../icons.js';

export const template = function(scope) { return html`

<div class="header">
    <h2>Step 2</h2>
    <span>Choose a foreground image</span>
</div>

<input type="file" id="upload" @change=${(e) => scope.onLocalImage(e) } name="img" accept="image/*">
<div id="preview" style="background-image: url(${scope.currentImage})"></div>

<div class="button-row centered">
    <sp-action-button variant="secondary" @click=${() => scope.randomImage()} >
        <sp-icon size="s" slot="icon">${Shuffle}</sp-icon> Random
    </sp-action-button>
    <sp-action-button variant="secondary" @click=${() => scope.uploadImage()} >
        <sp-icon size="s" slot="icon">${Upload}</sp-icon> Upload
    </sp-action-button>
    <sp-action-button variant="secondary" @click=${() => scope.useCamera()}>
        <sp-icon size="s" slot="icon">${Camera}</sp-icon> ${scope.cameraEnabled ? 'Snap' : 'Camera'}
    </sp-action-button>
</div>

<div class="navigation-row">
    <sp-button variant="secondary" @click=${() => scope.navigate('back')}>Back</sp-button>
    <sp-button @click=${() => scope.navigate('next')}>Next</sp-button>
</div>
`;}
