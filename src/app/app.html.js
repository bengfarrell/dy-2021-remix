import {html} from 'lit-html';
import '@spectrum-web-components/theme/sp-theme';
import '@spectrum-web-components/theme/theme-light';
import '@spectrum-web-components/theme/src/themes.js';
import '../layer-chooser/layer-chooser';

export const template = function(scope) { return html`

<sp-theme scale="medium" color="light">
    <remix-layer-chooser mode="${scope.mode}"></remix-layer-chooser>
</sp-theme>
`};
