import './App.css';

// --- Re-define interfaces to match the new structure ---
// This is redundant if you have a central types file, but necessary here for a standalone component.
interface Familiar { id?: number; nombre_completo: string; parentesco: string; celular: string; activo: boolean; }
interface Estudio { id?: number; nivel: string; carrera: string; institucion: string; estado: string; activo: boolean; }
interface Contrato { id?: number; tipo_contrato: string; tipo_trabajador: string; contrato_fiscal: string; fecha_inicio: string; fecha_fin: string; fecha_fin_pactada: string; salario_base: string; jornada_laboral: string; estado_contrato: string; observaciones: string; }

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
    cargo_nombre?: string;
    departamento_nombre?: string;
    jefe_info?: { id: number, nombres: string, apellido_paterno: string };
    
    // Files
    fotocopia_ci?: string;
    curriculum_vitae?: string;
    certificado_antecedentes?: string;
    fotocopia_luz_agua_gas?: string;
    croquis_domicilio?: string;
    fotocopia_licencia_conducir?: string;
    
    // Nested objects
    familiares: Familiar[];
    estudios: Estudio[];
    contratos: Contrato[];
}

interface EmployeeProfileProps {
  employee: Empleado;
  onBack: () => void;
}

// Helper to render a file link
const FileLink = ({ url, label }: { url?: string, label: string }) => {
    if (!url) return <p><strong>{label}:</strong> No adjuntado</p>;
    return (
        <p>
            <strong>{label}:</strong>{' '}
            <a href={url} target="_blank" rel="noopener noreferrer">Ver Documento</a>
        </p>
    );
};

// --- Main Profile Component ---
function EmployeeProfile({ employee, onBack }: EmployeeProfileProps) {
  return (
    <div className="profile-container">
      <button onClick={onBack} className="back-button" style={{ position: 'static', marginBottom: '20px' }}>
        &larr; Volver a la Lista
      </button>

      <div className="profile-card">
        <h2>{employee.nombres} {employee.apellido_paterno} {employee.apellido_materno}</h2>
        <p><strong>CI:</strong> {employee.ci}</p>
      </div>

      {/* --- HR Information --- */}
      <div className="profile-card">
        <h3>Información de RRHH</h3>
        <p><strong>Cargo:</strong> {employee.cargo_nombre || 'N/A'}</p>
        <p><strong>Departamento (Sector):</strong> {employee.departamento_nombre || 'N/A'}</p>
        <p><strong>Jefe Inmediato:</strong> {employee.jefe_info ? `${employee.jefe_info.nombres} ${employee.jefe_info.apellido_paterno}` : 'N/A'}</p>
        <p><strong>Fecha de Ingreso:</strong> {employee.fecha_ingreso_inicial}</p>
      </div>

      {/* --- Personal Information --- */}
      <div className="profile-card">
        <h3>Información Personal</h3>
        <p><strong>Email:</strong> {employee.email}</p>
        <p><strong>Celular:</strong> {employee.celular}</p>
        <p><strong>Fecha de Nacimiento:</strong> {employee.fecha_nacimiento}</p>
        <p><strong>Sexo:</strong> {employee.sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
        <p><strong>Estado Civil:</strong> {employee.estado_civil}</p>
        <p><strong>Nombre de Cónyuge:</strong> {employee.nombre_conyuge || 'N/A'}</p>
        <p><strong>Nacionalidad:</strong> {employee.nacionalidad}</p>
        <p><strong>Dirección:</strong> {`${employee.direccion}, ${employee.provincia}`}</p>
      </div>
      
      {/* --- Contratos --- */}
      <div className="profile-card">
        <h3>Contratos</h3>
        {employee.contratos?.length > 0 ? (
            <table>
                <thead><tr><th>Tipo</th><th>Salario</th><th>Inicio</th><th>Fin</th><th>Estado</th></tr></thead>
                <tbody>
                    {employee.contratos.map((item, index) => (
                        <tr key={index}><td>{item.tipo_contrato}</td><td>{item.salario_base}</td><td>{item.fecha_inicio}</td><td>{item.fecha_fin || 'N/A'}</td><td>{item.estado_contrato}</td></tr>
                    ))}
                </tbody>
            </table>
        ) : <p>No hay contratos registrados.</p>}
      </div>

      {/* --- Familiares --- */}
      <div className="profile-card">
        <h3>Familiares</h3>
        {employee.familiares?.length > 0 ? (
            <table>
                <thead><tr><th>Nombre</th><th>Parentesco</th><th>Celular</th></tr></thead>
                <tbody>
                    {employee.familiares.map((item, index) => (
                        <tr key={index}><td>{item.nombre_completo}</td><td>{item.parentesco}</td><td>{item.celular}</td></tr>
                    ))}
                </tbody>
            </table>
        ) : <p>No hay familiares registrados.</p>}
      </div>

      {/* --- Estudios --- */}
       <div className="profile-card">
        <h3>Estudios</h3>
        {employee.estudios?.length > 0 ? (
            <table>
                <thead><tr><th>Nivel</th><th>Carrera/Estudio</th><th>Institución</th><th>Estado</th></tr></thead>
                <tbody>
                    {employee.estudios.map((item, index) => (
                        <tr key={index}><td>{item.nivel}</td><td>{item.carrera}</td><td>{item.institucion}</td><td>{item.estado}</td></tr>
                    ))}
                </tbody>
            </table>
        ) : <p>No hay estudios registrados.</p>}
      </div>

      {/* --- Documentos --- */}
      <div className="profile-card">
        <h3>Documentos Adjuntos</h3>
        <FileLink url={employee.fotocopia_ci} label="Fotocopia CI" />
        <FileLink url={employee.curriculum_vitae} label="Curriculum Vitae" />
        <FileLink url={employee.certificado_antecedentes} label="Cert. Antecedentes" />
        <FileLink url={employee.fotocopia_luz_agua_gas} label="Factura Luz/Agua" />
        <FileLink url={employee.croquis_domicilio} label="Croquis Domicilio" />
        <FileLink url={employee.fotocopia_licencia_conducir} label="Licencia de Conducir" />
      </div>
    </div>
  );
}

export default EmployeeProfile;