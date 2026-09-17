import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import DetalleEvento from './pages/DetalleEvento';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/evento/:id" element={<DetalleEvento />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;