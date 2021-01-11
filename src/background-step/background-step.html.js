import {html} from 'lit-html';
import '@spectrum-web-components/button/sp-action-button';
import '@spectrum-web-components/button/sp-button';
import '@spectrum-web-components/icon/sp-icon';
import { Shuffle, Upload } from '../icons.js';

export const template = function(scope) { return html`
        
<div class="header">
    <h2>Step 1</h2>
    <span>Choose a background image</span>
</div>

<div class="button-row centered">
    <sp-action-button @click=${() => scope.randomImage()} variant="secondary">
        <sp-icon size="s" slot="icon">${Shuffle}</sp-icon> Generate a random image
    </sp-action-button>
    <sp-action-button @click=${() => scope.uploadImage()} variant="secondary">
        <sp-icon size="s" slot="icon">${Upload}</sp-icon> Upload your own image
    </sp-action-button>
</div>

<div class="navigation-row">
    <sp-button>Next</sp-button>
</div>
`};
