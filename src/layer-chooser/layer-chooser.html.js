import {html, nothing} from 'lit-html';
import '@spectrum-web-components/button/sp-button';
import { Components } from 'halftone.js';

export const template = function(scope) { return html`        
<halftone-svg blendmode="overlay" src="${scope.foregroundImage}">
    <div id="bgimage" style="background-image: url(${scope.backgroundImage})"></div>
</halftone-svg>

<div id="button-row">
    ${scope.mode === 'complete' ?  html`
                <sp-button variant="primary" @click="${() => scope.upload()}">Upload to Gallery</sp-button>
                <sp-button variant="primary" @click="${() => scope.onDownloadImage()}">Download</sp-button>
                <sp-button @click="${() => scope.nextStep()}">Remix Again</sp-button>` : html`
                <input type="file" id="backgroundimage" @change=${(e) => scope.onLocalImage(e) } name="img" accept="image/*">
                <sp-button variant="primary" @click="${() => scope.nextImage()}">Try another</sp-button>
                <sp-button variant="primary" @click="${() => scope.uploadImage()}">Upload a file</sp-button>
                ${scope.mode === 'foreground' ? 
                        html`<sp-button variant="primary" 
                                        @click="${() => scope.onCameraClick()}">
                            ${scope.foregroundImage === 'camera' ? 'Snap picture' : 'Use my camera'}
                        </sp-button>` : nothing }
                <sp-button @click="${() => scope.nextStep()}">Next</sp-button>
    `}
</div>
`};
