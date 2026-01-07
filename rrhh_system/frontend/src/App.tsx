import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Routes, Route, useNavigate } from 'react-router-dom'; // Import Routes, Route, useNavigate
import './App.css';
import EmployeeForm from './EmployeeForm';
import Modal from './Modal';
import Login from './Login';
import Register from './Register'; // Import Register component
import Departments from './Departments';
import Cargos from './Cargos';
import EmployeeProfile from './EmployeeProfile';

// --- Main Employee Interface ---
interface Empleado {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string;
  ci: string;
  fecha_nacimiento: string;
  sexo: string;
  estado_civil: string;
  celular: string;
  email: string;
  provincia: string;
  direccion: string;
  tipo_vivienda: string;
  nacionalidad: string;
  nombre_conyuge?: string;
  tiene_hijos: boolean;
  fecha_ingreso_inicial: string;
  cargo: number | null;
  cargo_nombre?: string;
  departamento: number | null;
  departamento_nombre?: string;
  jefe: number | null;
  jefe_info?: { id: number, nombres: string, apellido_paterno: string };
  fotocopia_ci?: string;
  curriculum_vitae?: string;
  certificado_antecedentes?: string;
  fotocopia_luz_agua_gas?: string;
  croquis_domicilio?: string;
  fotocopia_licencia_conducir?: string;
  familiares: any[];
  estudios: any[];
  contratos: any[];
}

function App() {
  const navigate = useNavigate(); // Initialize useNavigate
  // --- State ---
  const [employees, setEmployees] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [view, setView] = useState<'employees' | 'departments' | 'cargos'>('employees');
  const [viewingEmployee, setViewingEmployee] = useState<Empleado | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);

  // Pagination State for Employees
  const [employeeCount, setEmployeeCount] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);

  // --- Logic ---
  useEffect(() => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Token ${authToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [authToken]);

  const fetchEmployees = useCallback(async (url: string = 'http://127.0.0.1:8000/api/empleados/') => {
    if (view !== 'employees') return;
    setLoading(true);
    try {
      const response = await axios.get(url);
      setEmployees(response.data.results); // Data is now in 'results'
      setEmployeeCount(response.data.count);
      setNextPageUrl(response.data.next);
      setPrevPageUrl(response.data.previous);
      setError('');
    } catch (err) {
      console.error("Error fetching employees:", err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setAuthToken(null);
        localStorage.removeItem('authToken');
      }
      setError('Failed to load employee data from backend.');
    } finally {
      setLoading(false);
    }
  }, [authToken, view]);

  useEffect(() => {
    if (authToken && !viewingEmployee) {
      if (view === 'employees') {
        fetchEmployees(); // Initial fetch
      } else {
        setLoading(false);
      }
    }
  }, [authToken, view, viewingEmployee]); // Removed fetchEmployees from here to prevent loops, initial fetch is handled by view change

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/empleados/${id}/`);
        fetchEmployees(); // Refetch current page
      } catch (err) {
        // ...
      }
    }
  };

  const handleFormSubmit = () => {
    setIsModalOpen(false);
    setEditingEmployeeId(null);
    fetchEmployees(); // Refetch to see the new/updated employee
  };

  // Other handlers remain mostly the same...
  const handleEdit = (id: number) => { setEditingEmployeeId(id); setIsModalOpen(true); };
  const handleCreate = () => { setEditingEmployeeId(null); setIsModalOpen(true); };
  const handleLoginSuccess = (token: string) => {
    setAuthToken(token);
    localStorage.setItem('authToken', token);
    navigate('/'); // Navigate to the main page after successful login
  };
  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('authToken');
    // Clear other states related to authenticated user data
    setEmployees([]);
    setNextPageUrl(null);
    setPrevPageUrl(null);
    setEmployeeCount(0);
    navigate('/login'); // Redirect to login page after logout
  };
  const handleViewProfile = (employee: Empleado) => setViewingEmployee(employee);
  const handleBackToList = () => setViewingEmployee(null);

  // Effect to redirect to login if not authenticated
  useEffect(() => {
    if (!authToken && window.location.pathname !== '/register' && window.location.pathname !== '/login') {
      navigate('/login');
    }
  }, [authToken, navigate]);

  // --- Render ---
  // The conditional rendering logic will be replaced by Routes

  // AppHeader will now include dynamic navigation based on authToken
  const AppHeader = (
    <div className="app-header-with-logout">
        <h1>HR Management System</h1>
        {authToken && ( // Only show navigation and logout if authenticated
          <>
            <nav>
                <button onClick={() => setView('employees')} disabled={view === 'employees'}>Empleados</button>
                <button onClick={() => setView('departments')} disabled={view === 'departments'}>Departamentos</button>
                <button onClick={() => setView('cargos')} disabled={view === 'cargos'}>Cargos</button>
            </nav>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </>
        )}
    </div>
  );

  return (
    <div className="App">
      {authToken && AppHeader} {/* Only show AppHeader if authenticated */}
      <Routes>
        {authToken ? (
          // Authenticated Routes
          <Route path="/*" element={ // Use path="/*" for authenticated users to catch all sub-routes
            <>
              {viewingEmployee ? (
                <EmployeeProfile employee={viewingEmployee} onBack={handleBackToList} />
              ) : (
                <>
                  {view === 'employees' && (
                    <>
                      <button onClick={handleCreate} className="create-button">Añadir Nuevo Empleado</button>
                      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingEmployeeId(null); }}>
                        <EmployeeForm onFormSubmit={handleFormSubmit} employeeId={editingEmployeeId} />
                      </Modal>
                      <div className="pagination-controls">
                        <span>Total: {employeeCount}</span>
                        <button onClick={() => fetchEmployees(prevPageUrl!)} disabled={!prevPageUrl}>Previous</button>
                        <button onClick={() => fetchEmployees(nextPageUrl!)} disabled={!nextPageUrl}>Next</button>
                      </div>
                      {loading ? (
                        <p>Loading employees...</p>
                      ) : error ? (
                        <p style={{ color: 'red' }}>{error}</p>
                      ) : employees.length > 0 ? (
                        <table>
                          <thead><tr><th>Nombre Completo</th><th>CI</th><th>Cargo</th><th>Departamento</th><th>Celular</th><th>Acciones</th></tr></thead>
                          <tbody>
                            {employees.map(employee => (
                              <tr key={employee.id}>
                                <td><a href="#" onClick={(e) => { e.preventDefault(); handleViewProfile(employee); }}>{`${employee.nombres} ${employee.apellido_paterno}`}</a></td>
                                <td>{employee.ci}</td>
                                <td>{employee.cargo_nombre}</td>
                                <td>{employee.departamento_nombre}</td>
                                <td>{employee.celular}</td>
                                <td className="actions-cell">
                                  <button onClick={() => handleEdit(employee.id)} className="edit-button">Edit</button>
                                  <button onClick={() => handleDelete(employee.id)} className="delete-button">Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p>No employees found. Add one above!</p>
                      )}
                      <div className="pagination-controls">
                        <span>Total: {employeeCount}</span>
                        <button onClick={() => fetchEmployees(prevPageUrl!)} disabled={!prevPageUrl}>Previous</button>
                        <button onClick={() => fetchEmployees(nextPageUrl!)} disabled={!nextPageUrl}>Next</button>
                      </div>
                    </>
                  )}
                  {view === 'departments' && <Departments />}
                  {view === 'cargos' && <Cargos />}
                </>
              )}
            </>
          } />
        ) : (
          // Unauthenticated Routes - wrapped in split-screen layout
          <Route path="/*" element={ // Use path="/*" to catch all unauthenticated routes
            <div className="auth-page-container">
              <div
                className="auth-image-side"
                style={{ backgroundImage: `url('https://source.unsplash.com/random/1200x800?office,farm,employees,nature')` }} // Placeholder image
              >
                <div className="content">
                  <h1>Avicola Rolon</h1>
                  <p>Sistema de Gestión de Recursos Humanos</p>
                </div>
              </div>
              <div className="auth-form-side">
                <Routes>
                  <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} /> {/* Default to login */}
                </Routes>
              </div>
            </div>
          } />
        )}
      </Routes>
    </div>
  );
}

export default App;
