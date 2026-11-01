import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import './styles/admin.css';
import Home from './pages/Home';
import DetalleEvento from './pages/DetalleEvento';
import Login from './pages/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import AdminLayout from './components/layout/AdminLayout';
import AdminInicio from './pages/admin/AdminInicio';
import AdminEventos from './pages/admin/AdminEventos';
import AdminEventoForm from './pages/admin/AdminEventoForm';

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
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminInicio />} />
          <Route path="eventos" element={<AdminEventos />} />
          <Route path="eventos/nuevo" element={<AdminEventoForm />} />
          <Route path="eventos/:id/editar" element={<AdminEventoForm />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
