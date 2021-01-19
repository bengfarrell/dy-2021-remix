import {html} from 'lit-html';
import '@spectrum-web-components/theme/sp-theme';
import '@spectrum-web-components/theme/theme-light';
import '@spectrum-web-components/theme/src/themes.js';
import { Components } from 'halftone.js';
import Steps from '../steps/steps.js';

export const template = function(scope) { return html`

<sp-theme scale="medium" color="light">
    <div id="header">
        <a class="home" href="../index.html"><img class="logo" src="assets/deyoungsters-logo.svg" width="150" height="75" /></a>
        <a class="pagelink" href="../about.html">About</a>
        <a class="pagelink" href="../help.html">Help</a>
    </div>

    <div id="content">
        <halftone-svg 
                blendmode=${scope.blendMode} 
                distance=${scope.shapeDistance}
                shapecolor=${scope.shapeColor}
                crossbarlength="15"
                shapetype=${scope.shapeType} 
                src="${scope.foregroundImage}">
            <div id="bgimage" style="background-image: url(${scope.backgroundImage})"></div>
        </halftone-svg>
        <remix-steps></remix-steps>
    </div>
</sp-theme>
`};
