import {css} from "lit-element";

export const style = css`
    :host {
      display: inline-block;
    }
  
    sp-slider {
      width: 100%;
    }
  
    sp-patched-slider {
      background: linear-gradient(to right, red 0%, #ff0 17%, lime 33%, cyan 50%, blue 66%, #f0f 83%, red 100%);
      width: 100%;
    }

    #blend-modes sp-action-button {
      margin-right: 20px;
      margin-bottom: 5px;
    }

    #blend-modes {
      flex-wrap: wrap;
    }

    .button-row.shapes {
      display: flex;
      flex-wrap: wrap;
    }
  
    button.shape {
      border: none;
      background-color: initial;
      margin-right: 12px;
      margin-left: 12px;
      padding-top: 4px;
    }

    button.shape svg,
    button.shape svg path {
      fill: #707070;
      stroke: #707070;
    }

    button.shape[selected] svg,
    button.shape[selected] svg path {
      fill: #1473E6;
      stroke: #1473E6;
    }
`;
