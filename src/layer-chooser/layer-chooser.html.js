import {html, nothing} from 'lit-html';
import '@spectrum-web-components/button/sp-button';
import { Components } from 'halftone.js';

export const template = function(scope) { return html`        
<halftone-svg blendmode="overlay" src="${scope.foregroundImage}">
    <div id="bgimage" style="background-image: url(${scope.backgroundImage})"></div>
</halftone-svg>

<div id="button-row">
    <sp-button variant="primary" @click="${() => scope.upload()}">Upload to Gallery</sp-button>
    <sp-button variant="primary" @click="${() => scope.onDownloadImage()}">Download</sp-button>
    <input type="file" id="upload" @change=${(e) => scope.onLocalImage(e) } name="img" accept="image/*">
    <sp-button variant="primary" @click="${() => scope.nextImage('background')}">Try another Background</sp-button>
    <sp-button variant="primary" @click="${() => scope.nextImage('foreground')}">Try another Foreground</sp-button>
    <sp-button variant="primary" @click="${() => scope.uploadImage('background')}">Upload a background file</sp-button>
    <sp-button variant="primary" @click="${() => scope.uploadImage('foreground')}">Upload a foreground file</sp-button>
    <sp-button variant="primary" @click="${() => scope.onCameraClick()}">
        ${scope.foregroundImage === 'camera' ? 'Snap picture' : 'Use my camera'}
    </sp-button>
</div>
`};
