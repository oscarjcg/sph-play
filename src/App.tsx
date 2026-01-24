import './App.css'; // Or your styles file

import { ThreeScene2D } from './ThreeScene2D';
//import { ThreeScene3D } from './ThreeScene3D';


export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ThreeScene2D />
    </div>
  );
}