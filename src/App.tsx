import './App.css'; // Or your styles file
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { ThreeScene2D } from './ThreeScene2D';
//import { ThreeScene3D } from './ThreeScene3D';

const theme = createTheme()

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ThemeProvider theme={theme}>
        <ThreeScene2D />
      </ThemeProvider>
    </div>
  );
}