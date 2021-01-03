import {css} from "lit-element";

export const style = css`
    :host {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
    }
    
    halftone-svg {
      width: 100%;
      height: calc(100% - 175px);
      display: inline-block;
    }
  
    #bgimage {
      width: 100%; 
      height: 100%;
      display: inline-block;
      background-position: center;
      background-size: cover;
    }

  #button-row {
      margin-left: auto;
      margin-top: 15px;
      display: flex;
    }

    #button-row sp-button {
      margin-right: 15px;
    }

    #button-row input {
      display: none;
    }
`;
