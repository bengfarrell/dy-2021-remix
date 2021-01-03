import {html} from 'lit-html';
import '@spectrum-web-components/theme/sp-theme';
import '@spectrum-web-components/theme/theme-light';
import '@spectrum-web-components/theme/src/themes.js';
import '@spectrum-web-components/tabs/sp-tab';
import '@spectrum-web-components/tabs/sp-tabs';
import '../layer-chooser/layer-chooser';

export const template = function(scope) { return html`

<sp-theme scale="medium" color="light">
    Choose a
    <sp-tabs selected="${scope.mode}" @change=${(e) => scope.onTabChange(e)}>
        <sp-tab label="Background" value="background"></sp-tab>
        <sp-tab label="Foreground" value="foreground"></sp-tab>
    </sp-tabs>
    <remix-layer-chooser mode="${scope.mode}"></remix-layer-chooser>
</sp-theme>
`};
