import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      primary: string;
      secondary: string;
      error: string;
      success: string;
      text: {
        primary: string;
        secondary: string;
        white: string;
      };
      background: {
        default: string;
        paper: string;
        hover: string;
      };
      border: string;
      inputBg: string;
    };
    spacing: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    borderRadius: {
      sm: string;
      md: string;
      lg: string;
    };
    typography: {
      fontSizes: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
      };
      fontWeights: {
        regular: number;
        medium: number;
        bold: number;
      };
    };
    transitions: {
      default: string;
    };
    shadows: {
      none: string;
      sm: string;
      md: string;
      lg: string;
    };
    breakpoints: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  }
}
