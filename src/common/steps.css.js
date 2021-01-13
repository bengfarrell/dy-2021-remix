import {css} from "lit-element";

export const style = css`
    :host {
        padding: 15px;
        border-bottom-style: solid;
        border-bottom-width: 1px;
        border-bottom-color: #DDDDDD;
    }
  
    :host([disabled]) {
        height: 120px;
        background-color: #F4F4F4;
        color: #b8b8b8;
        pointer-events: none;
        overflow: hidden;
    }
    
    :host([disabled]) .header {
        margin-top: 25px;
        margin-bottom: 200px;
    } 
  
    .header {
        margin-bottom: 20px;
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
    
    .button-row {
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

    label {
        color: #747474;
        display: inline-block;
        font-size: 15px;
        margin-bottom: 5px;
        margin-right: 5px;
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
