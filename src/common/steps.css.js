import {css} from "lit-element";

export const style = css`
        :host {
          padding: 15px;
          border-bottom-style: solid;
          border-bottom-width: 1px;
          border-bottom-color: #707070;
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
`;
