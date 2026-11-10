import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import DetalleEvento from './pages/DetalleEvento';
import Login from './pages/Login';
import VerificarCorreo from './pages/VerificarCorreo';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/evento/:id"
          element={
            <ProtectedRoute>
              <DetalleEvento />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/verificar-correo" element={<VerificarCorreo />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;