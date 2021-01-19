import {html} from 'lit-html';
import '@spectrum-web-components/action-button/sp-action-button';
import '@spectrum-web-components/icon/sp-icon';
import '@spectrum-web-components/field-label/sp-field-label';
import '@spectrum-web-components/textfield/sp-textfield';
import { FloppyDisk, SaveFloppy } from '../icons.js';

export const template = function(scope) { return html`

<div class="header">
    <div class="preview illustrated">${FloppyDisk}</div>
    <div>
        <h2>Step 4</h2>
        <span>Save and submit your creation</span>
    </div>
</div>
<span>* You’ll be submitting to the de Young staff for approval. Check the gallery later to see your creation</span>
<br /><br />

<div class="form-row">
    <div class="field">
        <sp-field-label for="firstname">First Name</sp-field-label>
        <sp-textfield id="firstname"></sp-textfield>
    </div>
    <div class="field">
        <sp-field-label for="lastinitial">Last Initial</sp-field-label>
        <sp-textfield id="lastinitial" style="width: 40px"></sp-textfield>
    </div>
    <div class="field">
        <sp-field-label for="age">Age</sp-field-label>
        <sp-textfield id="age" style="width: 40px"></sp-textfield>
    </div>
</div>

<sp-field-label size="l">Download</sp-field-label>
<div class="button-row">
    <sp-action-button @click=${() => scope.saveAs('jpg')}>
        <sp-icon size="s" slot="icon">${SaveFloppy}</sp-icon> Download your masterpiece
    </sp-action-button>
</div>

<br />
<div class="navigation-row">
    <sp-button variant="secondary" @click=${() => scope.navigate('back')}>Back</sp-button>
    <sp-button @click=${() => scope.submit()}>Submit & Return to Gallery</sp-button>
</div>
`};
