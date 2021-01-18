import {css} from "lit-element";

export const style = css`
    :host {
        padding: 15px;
        border-bottom-style: solid;
        border-bottom-width: 1px;
        border-bottom-color: #DDDDDD;
    }
  
    :host([disabled]) {
        min-height: 120px;
        height: 120px;
        background-color: #F4F4F4;
        color: #b8b8b8;
        pointer-events: none;
        overflow: hidden;
    }
    
    :host([disabled]) .header {
        margin-top: 10px;
        margin-bottom: 200px;
    }

    :host([disabled]) .header .preview {
      display: inline-block;
    }
  
    .header {
        margin-bottom: 20px;
        display: flex;
        align-items: center;
    }
    
    .header .preview {
        width: 98px;
        height: 74px;
        border-style: solid;
        border-width: 1px;
        border-color: #D3D3D3;
        border-radius: 5px;
        margin-right: 15px;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        display: none;
    }

    .header .preview.illustrated {
      border: none;
      text-align: center;
    }
    
    .header h2 {
        font-size: 22px;
        font-weight: bold;
        margin: 0;
    }
    
    .header span {
        font-weight: bold;
        font-size: 18px;
    }
    
    .button-row,
    .form-row {
        display: flex;
        align-items: center;
        margin-bottom: 25px;
    }

    .button-row.centered {
        justify-content: center;
    }
    
    .navigation-row {
        display: flex;
        justify-content: flex-end;
    }
    
    sp-action-button {
        margin-right: 15px;
    }

    sp-button {
        margin-right: 15px;
    }

    input#upload {
        display: none;
    }
    
    #preview {
        height: 170px;
        background-color: #F4F4F4;
        border-style: solid;
        border-width: 1px;
        border-color: #D3D3D3;
        margin-bottom: 25px;
        background-position: center;
        background-size: contain;
        background-repeat: no-repeat;
    }
`;
