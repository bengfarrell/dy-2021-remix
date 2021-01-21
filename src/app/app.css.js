import {css} from "lit-element";

export const style = css`
    :host {
        height: 100vh;
        width: 100vw;
        background-color: white;
    }
  
    sp-theme {
      display: flex;
      flex-direction: column;
      font-family: akzidenz-grotesk-next-pro, sans-serif;
      font-style: normal;
      font-weight: 300;
      --spectrum-alias-body-text-font-family: akzidenz-grotesk-next-pro, sans-serif;
      --spectrum-global-font-family-base: akzidenz-grotesk-next-pro, sans-serif;
      --spectrum-alias-component-text-line-height: 1;
      --spectrum-global-font-line-height-small: 1;
    }
  
    #header {
      height: 75px;
      background-color: white;
      display: flex;
      width: 100%;
      box-shadow: 0px 6px 5px 0px rgba(173,173,173,.5);
      align-items: center;
    }

    #header a.pagelink {
      color: black;
      text-decoration: none;
      margin-right: 30px;
      font-size: 22px;
    }

    #header a.home {
      margin-right: auto;
    }
  
    #content {
      display: flex;
      width: 100%;
      height: calc(100% - 75px);
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
        background-color: #d7d7d7;
    }

    #bgimage {
        width: 100%;
        height: 100%;
        display: inline-block;
        background-position: center;
        background-size: cover;
    }

    @media only screen and (max-width:511px) {
      #header a.pagelink {
        font-size: 14px;
      }
    }

    @media only screen and (min-width:511px) and (max-width:1023px) {
      #header a.pagelink {
        font-size: 16px;
      }
    }

    @media only screen and (max-width:1023px) {
      #content {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: calc(100% - 75px);
      }
      
      halftone-svg {
        width: 100%;
        height: initial;
      }
      
      remix-steps {
        width: 100%;
        max-width: 100%;
        flex: 1;
      }
    }
`;
