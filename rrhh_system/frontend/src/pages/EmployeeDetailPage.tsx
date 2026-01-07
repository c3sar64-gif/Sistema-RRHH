// src/pages/EmployeeDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';

// Usamos la misma interfaz que el formulario para consistencia
interface EmployeeData {
  id: number;
  nombres: string; apellido_paterno: string; apellido_materno: string; ci: string; fecha_nacimiento: string;
  sexo: string; estado_civil: string; celular: string; email: string; provincia: string;
  direccion: string; tipo_vivienda: string; nacionalidad: string;
  nombre_conyuge: string; tiene_hijos: boolean; fecha_ingreso_inicial: string;
  cargo_nombre: string; departamento_nombre: string; 
  jefe_info: { nombres: string, apellido_paterno: string };
  foto?: string;
  fotocopia_ci?: string; curriculum_vitae?: string; certificado_antecedentes?: string;
  fotocopia_luz_agua_gas?: string; croquis_domicilio?: string; fotocopia_licencia_conducir?: string;
  familiares: { nombre_completo: string; parentesco: string; celular: string; }[];
  estudios: { nivel: string; carrera: string; institucion: string; estado: string; }[];
  contratos: { tipo_contrato: string; tipo_trabajador: string; contrato_fiscal: string; fecha_inicio: string; fecha_fin_pactada: string; salario_base: string; jornada_laboral: string; estado_contrato: string; observaciones: string; }[];
}

const DetailItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div>
    <p className="text-sm font-medium text-gray-500">{label}</p>
    <p className="mt-1 text-sm text-gray-900">{value || '-'}</p>
  </div>
);

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      try {
        axios.defaults.baseURL = 'http://127.0.0.1:8000';
        const response = await axios.get(`/api/empleados/${id}/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        setEmployee(response.data);
      } catch (err) {
        setError('No se pudo cargar la información del empleado.');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id, token]);

  if (loading) return <div>Cargando empleado...</div>;
  if (error) return <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>;
  if (!employee) return <div>Empleado no encontrado.</div>;

  const documentFields = [
      { key: 'fotocopia_ci', label: 'Fotocopia CI' },
      { key: 'curriculum_vitae', label: 'Curriculum Vitae' },
      { key: 'certificado_antecedentes', label: 'Cert. Antecedentes' },
      { key: 'fotocopia_luz_agua_gas', label: 'Fact. Luz/Agua' },
      { key: 'croquis_domicilio', label: 'Croquis Domicilio' },
      { key: 'fotocopia_licencia_conducir', label: 'Licencia de Conducir' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Detalle del Empleado</h1>
        <div>
            <Link to="/empleados" className="mr-3 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Volver a la Lista</Link>
            <button onClick={() => navigate(`/empleados/editar/${id}`)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold">Editar Empleado</button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-6">
        <img src={employee.foto ? `http://127.0.0.1:8000${employee.foto}` : 'https://via.placeholder.com/150'} alt="Foto de perfil" className="h-32 w-32 rounded-full object-cover border-4 border-gray-200"/>
        <div>
            <h2 className="text-3xl font-bold text-gray-800">{`${employee.nombres} ${employee.apellido_paterno} ${employee.apellido_materno}`}</h2>
            <p className="text-xl text-indigo-600">{employee.cargo_nombre || 'Cargo no asignado'}</p>
            <p className="text-md text-gray-500">{employee.departamento_nombre || 'Departamento no asignado'}</p>
        </div>
      </div>

      {/* Secciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            {/* Info Personal */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">Información Personal</h3>
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
                    <DetailItem label="CI" value={employee.ci} />
                    <DetailItem label="Fecha de Nacimiento" value={employee.fecha_nacimiento} />
                    <DetailItem label="Sexo" value={employee.sexo === 'M' ? 'Masculino' : 'Femenino'} />
                    <DetailItem label="Estado Civil" value={employee.estado_civil} />
                    <DetailItem label="Celular" value={employee.celular} />
                    <DetailItem label="Email" value={employee.email} />
                    <DetailItem label="Nacionalidad" value={employee.nacionalidad} />
                    <DetailItem label="Provincia" value={employee.provincia} />
                    <DetailItem label="Dirección" value={employee.direccion} />
                    <DetailItem label="Tipo de Vivienda" value={employee.tipo_vivienda} />
                    <DetailItem label="Nombre de Cónyuge" value={employee.nombre_conyuge} />
                    <DetailItem label="Tiene Hijos" value={employee.tiene_hijos ? 'Sí' : 'No'} />
                </dl>
            </div>

            {/* Info Laboral */}
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">Información Laboral</h3>
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
                    <DetailItem label="Fecha Ingreso Inicial" value={employee.fecha_ingreso_inicial} />
                    <DetailItem label="Jefe Inmediato" value={employee.jefe_info ? `${employee.jefe_info.nombres} ${employee.jefe_info.apellido_paterno}` : ''} />
                </dl>
            </div>
            
            {/* Documentos */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">Documentos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documentFields.map(({ key, label }) => {
                        const fileUrl = (employee as any)[key];
                        return fileUrl ? <a key={key} href={`http://127.0.0.1:8000${fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline p-3 bg-gray-50 rounded-md truncate">Ver {label}</a> : null;
                    })}
                </div>
            </div>
        </div>

        <div className="space-y-8">
            {/* Familiares */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">Familiares</h3>
                {employee.familiares.map((f, i) => <div key={i} className="mb-4"><p className="font-semibold">{f.nombre_completo}</p><p className="text-sm text-gray-500">{f.parentesco} - {f.celular}</p></div>)}
            </div>
            {/* Estudios */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">Estudios</h3>
                {employee.estudios.map((e, i) => <div key={i} className="mb-4"><p className="font-semibold">{e.carrera}</p><p className="text-sm text-gray-500">{e.nivel} en {e.institucion} ({e.estado})</p></div>)}
            </div>
            {/* Contratos */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">Contratos</h3>
                {employee.contratos.map((c, i) => <div key={i} className="mb-4"><p className="font-semibold">{c.tipo_contrato} ({c.estado_contrato})</p><p className="text-sm text-gray-500">Del {c.fecha_inicio} al {c.fecha_fin_pactada}</p><p className="text-sm text-gray-500">Salario: {c.salario_base}</p></div>)}
            </div>
        </div>
      </div>
    </div>
  );
};
