import {html} from 'lit-html';
import '@spectrum-web-components/button/sp-action-button';
import '@spectrum-web-components/icon/sp-icon';
import { SaveFloppy } from '../icons.js';

export const template = function(scope) { return html`

<div class="header">
    <h2>Step 3</h2>
    <span>Share and save your artwork!</span>
</div>

<div class="button-row" id="download">
    <sp-action-button><sp-icon size="s" slot="icon">${SaveFloppy}</sp-icon> Download as a JPG</sp-action-button>
    <sp-action-button><sp-icon size="s" slot="icon">${SaveFloppy}</sp-icon> Download as a PNG</sp-action-button>
</div>

<div class="navigation-row">
    <sp-button variant="secondary">Back</sp-button>
    <sp-button>Finish</sp-button>
</div>
`};
