import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0D1B2A', // Azul escuro
      contrastText: '#FFFFFF', // Branco
    },
    background: {
      default: '#FFFFFF', // Branco
      paper: '#F5F6FA',
    },
    text: {
      primary: '#0D1B2A',
      secondary: '#415A77',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

export default theme; 