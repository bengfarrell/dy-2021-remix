import {html} from 'lit-html';
import BackgroundStep from '../background-step/background-step.js';
import ForegroundStep from '../foreground-step/foreground-step.js';
import SettingsStep from '../settings-step/settings-step.js';
import FinalStep from '../final-step/final-step.js';

export const template = function(scope) { return html`
    <remix-background-step ?disabled="${scope.currentStep !== 0}"></remix-background-step>
    <remix-foreground-step ?disabled="${scope.currentStep !== 1}"></remix-foreground-step>
    <remix-settings-step ?disabled="${scope.currentStep !== 2}"></remix-settings-step>
    <remix-final-step ?disabled="${scope.currentStep !== 3}"></remix-final-step>
`};
