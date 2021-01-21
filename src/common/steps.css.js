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
        pointer-events: none;
        overflow: hidden;
    }
    
    :host([disabled]) .header {
        margin-top: 10px;
        margin-bottom: 200px;
        color: #b8b8b8;
    }

    :host([disabled]) .header .preview {
      display: inline-block;
    }
  
    .header {
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        color: #323232;
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

    .header h2 span {
      display: inline-block;
    }
    
    .header span.subhead {
        font-weight: bold;
        font-size: 18px;
    }
    
    .button-row,
    .form-row {
        display: flex;
        align-items: center;
        margin-bottom: 25px;
        flex-wrap: wrap;
    }

    .button-or-separator {
      width: 100%;
      text-align: center;
      font-weight: bold;
      color: #747474;
      font-size: 15px;
      display: none;
      padding-top: 8px;
      padding-bottom: 8px;
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
  
    sp-button span {
      padding-top: 4px;
      display: inline-block;
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

    @media only screen and (max-width:767px) {
      #preview {
        display: none;
      }

      .button-or-separator {
        display: inline-block;
      }

      sp-action-button {
        margin-right: 2px;
      }

    }

    @media only screen and (max-width:1023px) {
      :host([disabled]) {
        display: none;
      }

      :host {
        border: none;
      }

      .header h2 {
        font-size: 16px;
        color: #323232;
      }

      .header span.subhead {
        font-size: 16px;
      }
    }

    @media only screen and (max-width:511px) {
      .header h2 {
        font-size: 17px;
      }

      .header span.subhead {
        font-size: 19px;
      }

      sp-button {
        margin-right: 8px;
      }
    }

    @media only screen and (min-width:767px) {
      .page-of {
        display: none;
      }
    }
    
    @media only screen and (min-width:511px) and (max-width:767px) {
        .header h2 {
          font-size: 19px;
        }
        
        .header span.subhead {
          font-size: 19px;
        }
    }

    @media only screen and (min-width:768px) and (max-width:1023px) {
        .header h2 {
          font-size: 22px;
        }
        
        .header span.subhead {
          font-size: 27px;
        }
    }
`;
