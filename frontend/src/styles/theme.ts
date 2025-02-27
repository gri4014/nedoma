const theme = {
  colors: {
    primary: '#6A4DFF', // Updated primary color to complement the new background
    secondary: '#8E7DBC', // Updated secondary color
    error: '#dc3545',
    success: '#28a745',
    text: {
      primary: '#000000', // Changed to black
      secondary: '#4A4A4A', // Darker secondary text
      white: '#ffffff' // Keeping this for reference
    },
    background: {
      default: '#F9F7FE', // New background color
      paper: '#FFFFFF',
      hover: '#EFEAF9' // Lighter hover state
    },
    border: '#D8D0F0', // Updated border color
    inputBg: '#FFFFFF'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '16px'
  },
  typography: {
    fontSizes: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '20px',
      xl: '24px'
    },
    fontWeights: {
      regular: 400,
      medium: 500,
      bold: 700
    }
  },
  transitions: {
    default: '0.2s ease-in-out'
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)'
  },
  breakpoints: {
    xs: '0px',
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px'
  }
};

export default theme;
