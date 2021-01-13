import {css} from "lit-element";

export const style = css`
    :host {
        height: 100vh;
        width: 100vw;
        display: flex;
    }

    remix-steps {
      max-width: 500px;
    }
      
    sp-theme {
        height: 100%;
        width: 100%;
        display: flex;
    }  
    
    halftone-svg {
        display: inline-block;
        flex: 1;
        height: 100%;
    }

    #bgimage {
        width: 100%;
        height: 100%;
        display: inline-block;
        background-position: center;
        background-size: cover;
    }
`;
