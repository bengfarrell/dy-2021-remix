import {css} from "lit-element";

export const style = css`
    :host {
      display: inline-block;
      --spectrum-actionbutton-background-color-selected: var(--spectrum-global-color-blue-500);
      --spectrum-actionbutton-background-color-selected-hover: var(--spectrum-global-color-blue-500);
      --spectrum-actionbutton-emphasized-background-color-selected-hover: var(--spectrum-global-color-blue-500);
      --spectrum-actionbutton-text-color-selected: white;
      --spectrum-actionbutton-text-color-selected-hover: white;
    }
  
    sp-patched-slider {
      width: 70%;
    }

    #blend-modes sp-action-button {
      margin-right: 5px;
      margin-bottom: 5px;
    }

    #blend-modes {
      flex-wrap: wrap;
    }
`;
