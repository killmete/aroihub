import { createTheme } from '@mui/material/styles';

export const aroihubTheme = createTheme({
  typography: {
    fontFamily: '"Kanit", "sans-serif"',
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px', // More rounded corners
            fontFamily: '"Kanit", "sans-serif"',
          },
          '& .MuiInputBase-input': {
            fontFamily: '"Kanit", "sans-serif"',
          },
          '& .MuiInputLabel-root': {
            fontFamily: '"Kanit", "sans-serif"',
          },
        },
      },
    },
  },
});