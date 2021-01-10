import {html} from 'lit-html';
import BackgroundStep from '../background-step/background-step.js';
import ForegroundStep from '../foreground-step/foreground-step.js';
import FinalStep from '../final-step/final-step.js';

export const template = function(scope) { return html`
    <remix-background-step></remix-background-step>
    <remix-foreground-step></remix-foreground-step>
    <remix-final-step></remix-final-step>
`};
