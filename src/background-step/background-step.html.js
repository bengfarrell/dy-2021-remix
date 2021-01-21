import {html} from 'lit-html';
import '@spectrum-web-components/action-button/sp-action-button';
import '@spectrum-web-components/button/sp-button';
import '@spectrum-web-components/icon/sp-icon';
import { Shuffle, Upload } from '../icons.js';

export const template = function(scope) { return html`
        
<div class="header">
    <div class="preview" style="background-image: url(${scope.currentImage})"></div>
    <div>
        <h2>Step 1 <span class="page-of">of 4</span></h2>
        <span class="subhead">Choose a background image</span>
    </div>
</div>

<input type="file" id="upload" @change=${(e) => scope.onLocalImage(e) } name="img" accept="image/*">
<div id="preview" style="background-image: url(${scope.currentImage})"></div>

<div class="button-row centered">
    <sp-action-button @click=${() => scope.randomImage()} variant="secondary">
        <sp-icon size="s" slot="icon">${Shuffle}</sp-icon> Generate a random image
    </sp-action-button>
    <span class="button-or-separator">OR</span>
    <sp-action-button @click=${() => scope.uploadImage()} variant="secondary">
        <sp-icon size="s" slot="icon">${Upload}</sp-icon> Upload your own image
    </sp-action-button>
</div>

<div class="navigation-row">
    <sp-button @click=${() => scope.navigate('next')}><span>Next</span></sp-button>
</div>
`};