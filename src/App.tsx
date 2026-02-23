import './App.css'; // Or your styles file
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Paper, Fade } from '@mui/material';
import { useState } from 'react';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import { ThreeScene2D } from './ThreeScene2D';
import { ThreeScene3D } from './ThreeScene3D';


const theme = createTheme()

export default function App() {
  const [tab, setTab] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box 
        sx={{ 
          width: '100vw', 
          height: '100vh', 
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'background.default'
        }}
      >
        <Box sx={{ width: '100%', height: '100%' }}>
          {tab === 0 ? <ThreeScene2D /> : <ThreeScene3D />}
        </Box>

        <Fade in timeout={600}>
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              top: 8,
              right: 100,
              zIndex: 1300,
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'rgba(255, 255, 255, 0.23)',
            
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.3)',
              }
            }}
          >
            <Tabs
              value={tab}
              onChange={handleChange}
              variant="fullWidth"
              sx={{
                minWidth: 240,
                '& .MuiTab-root': {
                  minHeight: 48,
                  px: 4,
                  fontWeight: 500,
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'primary.main',
                  height: 3,
                }
              }}
            >
              <Tab label="2D SPH" />
              <Tab label="3D SPH" />
            </Tabs>
          </Paper>
        </Fade>
      </Box>
    </ThemeProvider>
  );
}