import {html} from 'lit-html';
import '@spectrum-web-components/theme/sp-theme';
import '@spectrum-web-components/theme/theme-light';
import '@spectrum-web-components/theme/src/themes.js';
import { Components } from 'halftone.js';
import Steps from '../steps/steps.js';

export const template = function(scope) { return html`

<sp-theme scale="medium" color="light">
    <halftone-svg 
            blendmode=${scope.blendMode} 
            distance=${scope.shapeDistance}
            shapecolor=${scope.shapeColor} 
            shapetype=${scope.shapeType} 
            src="${scope.foregroundImage}">
        <div id="bgimage" style="background-image: url(${scope.backgroundImage})"></div>
    </halftone-svg>
    <remix-steps></remix-steps>
</sp-theme>
`};