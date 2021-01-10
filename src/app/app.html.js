import {html} from 'lit-html';
import '@spectrum-web-components/theme/sp-theme';
import '@spectrum-web-components/theme/theme-light';
import '@spectrum-web-components/theme/src/themes.js';
import { Components } from 'halftone.js';
import Steps from '../steps/steps.js';

export const template = function(scope) { return html`

<sp-theme scale="medium" color="light">
    <remix-steps></remix-steps>
    <halftone-svg blendmode="overlay" src="${scope.foregroundImage}">
        <div id="bgimage" style="background-image: url('./sampleimages/sample1.jpeg')"></div>
    </halftone-svg>
</sp-theme>
`};
