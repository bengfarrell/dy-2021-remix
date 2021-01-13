import {html} from 'lit-html';
import '@spectrum-web-components/button/sp-action-button';
import '@spectrum-web-components/icon/sp-icon';
import { SaveFloppy } from '../icons.js';

export const template = function(scope) { return html`

<div class="header">
    <h2>Step 4</h2>
    <span>Share and save your artwork!</span>
</div>

<div class="button-row centered">
    <sp-action-button @click=${() => scope.saveAs('jpg')}>
        <sp-icon size="s" slot="icon">${SaveFloppy}</sp-icon> Download as a JPG
    </sp-action-button>
    <sp-action-button @click=${() => scope.saveAs('png')}>
        <sp-icon size="s" slot="icon">${SaveFloppy}</sp-icon> Download as a PNG
    </sp-action-button>
</div>

<span>* You’ll be submitting to the DeYoung staff for approval. Check the gallery later to see your creation</span>

<br />
<div class="navigation-row">
    <sp-button variant="secondary" @click=${() => scope.navigate('back')}>Back</sp-button>
    <sp-button>Submit & Return to Gallery</sp-button>
</div>
`};
