// src/pages/EmployeeFormPage.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { SearchableSelect } from '../components/SearchableSelect';

// --- Interfaces ---
interface Option { id: number; nombre: string; }
interface EmpleadoSimple { id: number; nombres: string; apellido_paterno: string; nombre: string; }
interface Familiar { id?: number; nombre_completo: string; parentesco: string; celular: string; fecha_nacimiento?: string; }
interface Estudio { id?: number; nivel: string; carrera: string; institucion: string; estado: string;}
interface Contrato { id?: number; tipo_contrato: string; tipo_trabajador: string; contrato_fiscal: string; fecha_inicio: string; fecha_fin_pactada: string; salario_base: string; jornada_laboral: string; estado_contrato: string; observaciones: string; }

// Extend the employee data type to include the new foto field
interface EmployeeData {
  nombres: string; apellido_paterno: string; apellido_materno: string; ci: string; fecha_nacimiento: string;
  sexo: string; estado_civil: string; celular: string; email: string; provincia: string;
  direccion: string; tipo_vivienda: string; nacionalidad: string;
  nombre_conyuge: string; tiene_hijos: boolean; fecha_ingreso_inicial: string;
  cargo: number | null; departamento: number | null; jefe: number | null;
  foto?: string; // foto is optional and will be a URL string
  fotocopia_ci?: string; curriculum_vitae?: string; certificado_antecedentes?: string;
  fotocopia_luz_agua_gas?: string; croquis_domicilio?: string; fotocopia_licencia_conducir?: string;
  familiares: Familiar[];
  estudios: Estudio[];
  contratos: Contrato[];
}

// --- Default State ---
const defaultEmployeeState: EmployeeData = {
  nombres: '', apellido_paterno: '', apellido_materno: '', ci: '', fecha_nacimiento: '',
  sexo: 'M', estado_civil: 'S', celular: '', email: '', provincia: '',
  direccion: '', tipo_vivienda: 'P', nacionalidad: 'Boliviana', // Changed from 'A' to 'P'
  nombre_conyuge: '', tiene_hijos: false, fecha_ingreso_inicial: '',
  cargo: null, departamento: null, jefe: null,
  familiares: [], estudios: [], contratos: [],
};

// --- Componente Principal ---
export const EmployeeFormPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const { token } = useAuth();
  const navigate = useNavigate();

  const [employeeData, setEmployeeData] = useState<EmployeeData>(defaultEmployeeState);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [cargos, setCargos] = useState<Option[]>([]);
  const [departamentos, setDepartamentos] = useState<Option[]>([]);
  const [jefes, setJefes] = useState<EmpleadoSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({}); // Estado para errores de validación del frontend

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        axios.defaults.baseURL = 'http://127.0.0.1:8000';
        
        const cargosRes = await axios.get('/api/cargos/?no_pagination=true', { headers: { 'Authorization': `Token ${token}` } });
        setCargos(cargosRes.data);

        const deptosRes = await axios.get('/api/departamentos/?no_pagination=true', { headers: { 'Authorization': `Token ${token}` } });
        setDepartamentos(deptosRes.data);

        const jefesRes = await axios.get('/api/jefes-departamento/', { headers: { 'Authorization': `Token ${token}` } });
        const jefesData = jefesRes.data.map((e: EmpleadoSimple) => ({...e, nombre: `${e.nombres} ${e.apellido_paterno} ${e.apellido_materno || ''}`.trim() }));
        setJefes(jefesData);

        if (isEditing) {
          const empRes = await axios.get(`/api/empleados/${id}/`, { headers: { 'Authorization': `Token ${token}` } });
          const data = empRes.data;
          for (const key in data) { if (data[key] === null) { data[key] = ''; } }
          data.familiares = data.familiares || [];
          data.estudios = data.estudios || [];
          data.contratos = data.contratos || [];
          setEmployeeData(data);
        }
      } catch (err) { setError('No se pudieron cargar los datos necesarios para el formulario.'); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [id, isEditing, token]);
  
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    if (type === 'checkbox') processedValue = (e.target as HTMLInputElement).checked;
    // The value from a select is a string, convert to number for IDs
    if (['departamento', 'jefe'].includes(name) || name === 'cargo') { // Include cargo here as well
        processedValue = value ? parseInt(value, 10) : null;
    }
    setEmployeeData(prev => ({ ...prev, [name]: processedValue }));
    setErrors(prev => ({ ...prev, [name]: '' })); // Clear error when field changes
  };

  const handleSelectChange = (name: 'cargo' | 'departamento' | 'jefe', option: Option | null) => { 
    setEmployeeData(prev => ({ ...prev, [name]: option ? option.id : null })); 
    setErrors(prev => ({ ...prev, [name]: '' })); // Clear error when field changes
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => { const { name, files: inputFiles } = e.target; if (inputFiles && inputFiles.length > 0) { setFiles(prev => ({ ...prev, [name]: inputFiles[0] })); } setErrors(prev => ({ ...prev, [name]: '' })); };
  const handleNestedChange = (index: number, e: ChangeEvent<HTMLInputElement | HTMLSelectElement>, section: 'familiares' | 'estudios' | 'contratos') => { 
    const { name, value } = e.target; 
    const list = [...(employeeData as any)[section]]; 
    (list[index] as any)[name] = value; 
    setEmployeeData(prev => ({ ...prev, [section]: list })); 
    setErrors(prev => ({ ...prev, [`${section}_${index}_${name}`]: '' })); // Clear error for nested field
  };
  const addNestedItem = (section: 'familiares' | 'estudios' | 'contratos', defaultItem: any) => { setEmployeeData(prev => ({ ...prev, [section]: [...(prev as any)[section], defaultItem] })); };
  const removeNestedItem = (index: number, section: 'familiares' | 'estudios' | 'contratos') => { setEmployeeData(prev => ({ ...prev, [section]: (prev as any)[section].filter((_: any, i: number) => i !== index)})); };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate personal information
    if (!employeeData.nombres.trim()) newErrors.nombres = 'Los nombres son requeridos.';
    if (!employeeData.apellido_paterno.trim()) newErrors.apellido_paterno = 'El apellido paterno es requerido.';
    if (!employeeData.ci.trim()) newErrors.ci = 'El CI es requerido.';
    if (!employeeData.fecha_nacimiento) newErrors.fecha_nacimiento = 'La fecha de nacimiento es requerida.';
    if (!employeeData.celular.trim()) newErrors.celular = 'El celular es requerido.';
    if (employeeData.email.trim() && !/\S+@\S+\.\S+/.test(employeeData.email)) newErrors.email = 'El formato del email es inválido.';
    if (!employeeData.provincia.trim()) newErrors.provincia = 'La provincia es requerida.';
    if (!employeeData.direccion.trim()) newErrors.direccion = 'La dirección es requerida.';
    if (!employeeData.nacionalidad.trim()) newErrors.nacionalidad = 'La nacionalidad es requerida.';

    // Validate HR Information
    if (!employeeData.fecha_ingreso_inicial) newErrors.fecha_ingreso_inicial = 'La fecha de ingreso inicial es requerida.';
    if (!employeeData.cargo) newErrors.cargo = 'El cargo es requerido.';
    if (!employeeData.departamento) newErrors.departamento = 'El departamento es requerido.';
    // Jefe is optional

    // Validate nested data (simplified: check if any item in a list has an empty required field)
    employeeData.familiares.forEach((f, index) => {
      if (!f.nombre_completo.trim()) newErrors[`familiares_${index}_nombre_completo`] = 'Nombre completo requerido.';
      if (f.parentesco !== 'hijo/a' && !f.parentesco.trim()) newErrors[`familiares_${index}_parentesco`] = 'Parentesco requerido.';
    });
    employeeData.estudios.forEach((e, index) => {
        if (!e.nivel.trim()) newErrors[`estudios_${index}_nivel`] = 'Nivel de estudio requerido.';
        if (!e.institucion.trim()) newErrors[`estudios_${index}_institucion`] = 'Institución requerida.';
        if (!e.carrera.trim()) newErrors[`estudios_${index}_carrera`] = 'Carrera requerida.';
        if (!e.estado.trim()) newErrors[`estudios_${index}_estado`] = 'Estado del estudio requerido.';
    });
    employeeData.contratos.forEach((c, index) => {
        if (!c.tipo_contrato.trim()) newErrors[`contratos_${index}_tipo_contrato`] = 'Tipo de contrato requerido.';
        if (!c.tipo_trabajador.trim()) newErrors[`contratos_${index}_tipo_trabajador`] = 'Tipo de trabajador requerido.';
        if (!c.contrato_fiscal.trim()) newErrors[`contratos_${index}_contrato_fiscal`] = 'Contrato fiscal requerido.';
        if (!c.fecha_inicio) newErrors[`contratos_${index}_fecha_inicio`] = 'Fecha de inicio de contrato requerida.';
        if (!c.salario_base || parseFloat(c.salario_base) <= 0) newErrors[`contratos_${index}_salario_base`] = 'Salario base requerido y debe ser mayor que 0.';
        if (!c.jornada_laboral.trim()) newErrors[`contratos_${index}_jornada_laboral`] = 'Jornada laboral requerida.';
        if (!c.estado_contrato.trim()) newErrors[`contratos_${index}_estado_contrato`] = 'Estado del contrato requerido.';
    });


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!validateForm()) {
        setLoading(false);
        // Scroll to the first error
        const firstErrorField = document.querySelector('.border-red-500');
        if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    const formData = new FormData();
    const fileFields = [
      'foto', 'fotocopia_ci', 'curriculum_vitae', 'certificado_antecedentes',
      'fotocopia_luz_agua_gas', 'croquis_domicilio', 'fotocopia_licencia_conducir'
    ];

    Object.entries(employeeData).forEach(([key, value]) => {
      // Excluye los arrays anidados y los campos de archivo de esta iteración.
      // Solo añade valores no nulos y no vacíos para campos que no son archivos ni arrays anidados.
      if (
        !['familiares', 'estudios', 'contratos'].includes(key) &&
        !fileFields.includes(key) && // Excluir campos de archivo de este bucle
        value !== null &&
        value !== ''
      ) {
        formData.append(key, String(value));
      }
    });
    Object.entries(files).forEach(([key, file]) => { if (file) { formData.append(key, file); } });

    formData.append('familiares_json', JSON.stringify(employeeData.familiares));
    formData.append('estudios_json', JSON.stringify(employeeData.estudios));
    formData.append('contratos_json', JSON.stringify(employeeData.contratos));

    const url = isEditing ? `/api/empleados/${id}/` : '/api/empleados/';
    const method = isEditing ? 'patch' : 'post';

    try {
      const response = await axios({ method, url, data: formData, headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Token ${token}` } });
      // Actualizar el estado employeeData con la respuesta del servidor
      // Esto asegura que las URLs de los archivos recién subidos se reflejen en el formulario
      setEmployeeData(prev => {
        // Asegurarse de que los campos nulos se conviertan a cadenas vacías para evitar errores de controlados no controlados
        const updatedData = { ...response.data };
        const fileFields = [
          'foto', 'fotocopia_ci', 'curriculum_vitae', 'certificado_antecedentes',
          'fotocopia_luz_agua_gas', 'croquis_domicilio', 'fotocopia_licencia_conducir'
        ];

        for (const key in updatedData) {
            // Solo convierte a cadena vacía si NO es un campo de archivo y el valor es null
            if (updatedData[key] === null && !fileFields.includes(key)) {
                updatedData[key] = '';
            }
            // Para campos de archivo, si el valor es null, lo dejamos como null para que `if (fileUrl)` funcione
        }
        return {
            ...prev,
            ...updatedData,
            // Los campos anidados no se actualizan directamente aquí desde response.data
            // ya que el serializer solo devuelve los IDs de los relacionados.
            // Para ver los cambios de anidados, se necesitaría recargar o hacer una lógica más compleja.
            // Pero para las URLs de archivos, esto es suficiente.
        };
      });
      navigate('/empleados');
    } catch (err: any) { setError(`Error al guardar: ${JSON.stringify(err.response?.data)}`); } 
    finally { setLoading(false); }
  };
  
  if (loading) return <div>Cargando formulario...</div>;
  if (error) return <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>;

  const inputStyles = "mt-1 block w-full rounded-md border-gray-300 shadow-md p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";
  
  const calculateAge = (birthDateString?: string) => {
    if (!birthDateString) return '';
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : '';
  };

  const documentFields = [
      { key: 'fotocopia_ci', label: 'Fotocopia CI' },
      { key: 'curriculum_vitae', label: 'Curriculum Vitae' },
      { key: 'certificado_antecedentes', label: 'Cert. Antecedentes' },
      { key: 'fotocopia_luz_agua_gas', label: 'Fact. Luz/Agua' },
      { key: 'croquis_domicilio', label: 'Croquis Domicilio' },
      { key: 'fotocopia_licencia_conducir', label: 'Licencia de Conducir' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex justify-between items-center mb-8 sticky top-0 bg-gray-200 py-4 z-10 px-6 -mx-6">
        <h1 className="text-3xl font-bold text-gray-800">{isEditing ? 'Editar Empleado' : 'Crear Nuevo Empleado'}</h1>
        <div>
            <button type="button" onClick={() => navigate('/empleados')} className="mr-3 px-4 py-2 text-gray-700 bg-gray-300 rounded-md hover:bg-gray-400 font-semibold">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold">Guardar Empleado</button>
        </div>
      </div>
      
      {isEditing && (
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-6">
            {employeeData.foto ? (            <img 
                src={employeeData.foto.startsWith('http://') || employeeData.foto.startsWith('https://') 
                    ? employeeData.foto 
                    : `http://127.0.0.1:8000${employeeData.foto}`} 
                alt="Foto de perfil" 
                className="h-32 w-32 rounded-full object-cover border-4 border-gray-200"
            /> ) : ( <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">Sin Foto</div> )}
            <div>
                <h2 className="text-2xl font-bold">{`${employeeData.nombres} ${employeeData.apellido_paterno}`}</h2>
                <p className="text-lg text-gray-600">{cargos.find(c => c.id === employeeData.cargo)?.nombre || 'Cargo no asignado'}</p>
            </div>
        </div>
      )}

      {/* 1. Información Personal */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">1. Información Personal</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label htmlFor="nombres" className="block text-sm font-medium text-gray-700">Nombres</label>
              <input type="text" id="nombres" name="nombres" value={employeeData.nombres} onChange={handleChange} className={`${inputStyles} ${errors.nombres ? 'border-red-500' : 'border-gray-300'}`} required />
              {errors.nombres && <p className="mt-1 text-xs text-red-500">{errors.nombres}</p>}
            </div>
            <div>
              <label htmlFor="apellido_paterno" className="block text-sm font-medium text-gray-700">Apellido Paterno</label>
              <input type="text" id="apellido_paterno" name="apellido_paterno" value={employeeData.apellido_paterno} onChange={handleChange} className={`${inputStyles} ${errors.apellido_paterno ? 'border-red-500' : 'border-gray-300'}`} required />
              {errors.apellido_paterno && <p className="mt-1 text-xs text-red-500">{errors.apellido_paterno}</p>}
            </div>
            <div>
              <label htmlFor="apellido_materno" className="block text-sm font-medium text-gray-700">Apellido Materno</label>
              <input type="text" id="apellido_materno" name="apellido_materno" value={employeeData.apellido_materno} onChange={handleChange} className={`${inputStyles} ${errors.apellido_materno ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.apellido_materno && <p className="mt-1 text-xs text-red-500">{errors.apellido_materno}</p>}
            </div>
            <div>
              <label htmlFor="ci" className="block text-sm font-medium text-gray-700">CI</label>
              <input type="text" id="ci" name="ci" value={employeeData.ci} onChange={handleChange} className={`${inputStyles} ${errors.ci ? 'border-red-500' : 'border-gray-300'}`} required/>
              {errors.ci && <p className="mt-1 text-xs text-red-500">{errors.ci}</p>}
            </div>
            <div>
              <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
              <input type="date" id="fecha_nacimiento" name="fecha_nacimiento" value={employeeData.fecha_nacimiento} onChange={handleChange} className={`${inputStyles} ${errors.fecha_nacimiento ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.fecha_nacimiento && <p className="mt-1 text-xs text-red-500">{errors.fecha_nacimiento}</p>}
            </div>
            <div>
              <label htmlFor="sexo" className="block text-sm font-medium text-gray-700">Sexo</label>
              <select id="sexo" name="sexo" value={employeeData.sexo} onChange={handleChange} className={`${inputStyles} ${errors.sexo ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
              {errors.sexo && <p className="mt-1 text-xs text-red-500">{errors.sexo}</p>}
            </div>
            <div>
              <label htmlFor="estado_civil" className="block text-sm font-medium text-gray-700">Estado Civil</label>
              <select id="estado_civil" name="estado_civil" value={employeeData.estado_civil} onChange={handleChange} className={`${inputStyles} ${errors.estado_civil ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="S">Soltero(a)</option>
                <option value="C">Casado(a)</option>
                <option value="V">Viudo(a)</option>
                <option value="D">Divorciado(a)</option>
              </select>
              {errors.estado_civil && <p className="mt-1 text-xs text-red-500">{errors.estado_civil}</p>}
            </div>
            <div>
              <label htmlFor="celular" className="block text-sm font-medium text-gray-700">Celular</label>
              <input type="tel" id="celular" name="celular" value={employeeData.celular} onChange={handleChange} className={`${inputStyles} ${errors.celular ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.celular && <p className="mt-1 text-xs text-red-500">{errors.celular}</p>}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" id="email" name="email" value={employeeData.email} onChange={handleChange} className={`${inputStyles} ${errors.email ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="provincia" className="block text-sm font-medium text-gray-700">Provincia</label>
              <input type="text" id="provincia" name="provincia" value={employeeData.provincia} onChange={handleChange} className={`${inputStyles} ${errors.provincia ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.provincia && <p className="mt-1 text-xs text-red-500">{errors.provincia}</p>}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección</label>
              <input type="text" id="direccion" name="direccion" value={employeeData.direccion} onChange={handleChange} className={`${inputStyles} ${errors.direccion ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.direccion && <p className="mt-1 text-xs text-red-500">{errors.direccion}</p>}
            </div>
            <div>
              <label htmlFor="tipo_vivienda" className="block text-sm font-medium text-gray-700">Tipo de Vivienda</label>
              <select id="tipo_vivienda" name="tipo_vivienda" value={employeeData.tipo_vivienda} onChange={handleChange} className={`${inputStyles} ${errors.tipo_vivienda ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="P">Propia</option>
                <option value="A">Alquilada</option>
                <option value="F">Familiar</option>
              </select>
              {errors.tipo_vivienda && <p className="mt-1 text-xs text-red-500">{errors.tipo_vivienda}</p>}
            </div>
            <div>
              <label htmlFor="nacionalidad" className="block text-sm font-medium text-gray-700">Nacionalidad</label>
              <input type="text" id="nacionalidad" name="nacionalidad" value={employeeData.nacionalidad} onChange={handleChange} className={`${inputStyles} ${errors.nacionalidad ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.nacionalidad && <p className="mt-1 text-xs text-red-500">{errors.nacionalidad}</p>}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="nombre_conyuge" className="block text-sm font-medium text-gray-700">Nombre de Cónyuge</label>
              <input type="text" id="nombre_conyuge" name="nombre_conyuge" value={employeeData.nombre_conyuge} onChange={handleChange} className={`${inputStyles} ${errors.nombre_conyuge ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.nombre_conyuge && <p className="mt-1 text-xs text-red-500">{errors.nombre_conyuge}</p>}
            </div>
            <div className="flex items-center pt-6">
              <input type="checkbox" id="tiene_hijos" name="tiene_hijos" checked={employeeData.tiene_hijos} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
              <label htmlFor="tiene_hijos" className="ml-2 block text-sm font-medium text-gray-900">¿Tiene Hijos?</label>
            </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">2. Información Familiar</h2>
        
        {employeeData.tiene_hijos && (
          <>
            <h3 className="text-lg font-semibold text-gray-600 mb-4 mt-6">Hijos</h3>
            <div className="space-y-4">
                <table className="min-w-full divide-y divide-gray-200 mb-4">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre Completo</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha de Nacimiento</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Edad</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {employeeData.familiares.filter(f => f.parentesco === 'hijo/a').map((h, i) => {
                            const originalIndex = employeeData.familiares.indexOf(h);
                            return (
                                <tr key={originalIndex}>
                                    <td>
                                        <input 
                                        type="text" 
                                        name="nombre_completo" 
                                        value={h.nombre_completo} 
                                        onChange={(e) => handleNestedChange(originalIndex, e, 'familiares')} 
                                        className={`${inputStyles} ${errors[`familiares_${originalIndex}_nombre_completo`] ? 'border-red-500' : 'border-gray-300'}`} 
                                        />
                                        {errors[`familiares_${originalIndex}_nombre_completo`] && <p className="mt-1 text-xs text-red-500">{errors[`familiares_${originalIndex}_nombre_completo`]}</p>}
                                    </td>
                                    <td>
                                        <input 
                                        type="date" 
                                        name="fecha_nacimiento" 
                                        value={h.fecha_nacimiento || ''} 
                                        onChange={(e) => handleNestedChange(originalIndex, e, 'familiares')} 
                                        className={`${inputStyles} ${errors[`familiares_${originalIndex}_fecha_nacimiento`] ? 'border-red-500' : 'border-gray-300'}`} 
                                        />
                                        {errors[`familiares_${originalIndex}_fecha_nacimiento`] && <p className="mt-1 text-xs text-red-500">{errors[`familiares_${originalIndex}_fecha_nacimiento`]}</p>}
                                    </td>
                                    <td>
                                        <span className="px-4 py-2 block text-sm text-gray-700">{calculateAge(h.fecha_nacimiento)}</span>
                                    </td>
                                    <td><button type="button" onClick={() => removeNestedItem(originalIndex, 'familiares')} className="text-red-500 p-2 rounded-full hover:bg-red-100">X</button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <button type="button" onClick={() => addNestedItem('familiares', { nombre_completo: '', parentesco: 'hijo/a', fecha_nacimiento: '', celular: '' })} className="text-indigo-600 text-sm font-semibold">+ Añadir Hijo</button>
            </div>
          </>
        )}
        
        <h3 className="text-lg font-semibold text-gray-600 mb-4 mt-8">Contactos de Emergencia</h3>
        <table className="min-w-full divide-y divide-gray-200 mb-4">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre Completo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parentesco</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Celular</th>
                    <th className="w-10"></th>
                </tr>
            </thead>
            <tbody>
                {employeeData.familiares.filter(f => f.parentesco !== 'hijo/a').map((c, i) => {
                    const originalIndex = employeeData.familiares.indexOf(c);
                    return (
                        <tr key={originalIndex}>
                            <td>
                                <input 
                                type="text" 
                                name="nombre_completo" 
                                value={c.nombre_completo} 
                                onChange={(e) => handleNestedChange(originalIndex, e, 'familiares')} 
                                className={`${inputStyles} ${errors[`familiares_${originalIndex}_nombre_completo`] ? 'border-red-500' : 'border-gray-300'}`} 
                                />
                                {errors[`familiares_${originalIndex}_nombre_completo`] && <p className="mt-1 text-xs text-red-500">{errors[`familiares_${originalIndex}_nombre_completo`]}</p>}
                            </td>
                            <td>
                                <select 
                                name="parentesco" 
                                value={c.parentesco} 
                                onChange={(e) => handleNestedChange(originalIndex, e, 'familiares')} 
                                className={`${inputStyles} ${errors[`familiares_${originalIndex}_parentesco`] ? 'border-red-500' : 'border-gray-300'}`}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="hijo/a">Hijo/a</option>
                                    <option value="padre">Padre</option>
                                    <option value="madre">Madre</option>
                                    <option value="esposo/a">Esposo/a</option>
                                    <option value="hermano/a">Hermano/a</option>
                                    <option value="otro">Otro</option>
                                </select>
                                {errors[`familiares_${originalIndex}_parentesco`] && <p className="mt-1 text-xs text-red-500">{errors[`familiares_${originalIndex}_parentesco`]}</p>}
                            </td>
                            <td>
                                <input 
                                type="text" 
                                name="celular" 
                                value={c.celular} 
                                onChange={(e) => handleNestedChange(originalIndex, e, 'familiares')} 
                                className={`${inputStyles} ${errors[`familiares_${originalIndex}_celular`] ? 'border-red-500' : 'border-gray-300'}`} 
                                />
                                {errors[`familiares_${originalIndex}_celular`] && <p className="mt-1 text-xs text-red-500">{errors[`familiares_${originalIndex}_celular`]}</p>}
                            </td>
                            <td><button type="button" onClick={() => removeNestedItem(originalIndex, 'familiares')} className="text-red-500 p-2 rounded-full hover:bg-red-100">X</button></td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
        <button type="button" onClick={() => addNestedItem('familiares', { nombre_completo: '', parentesco: '', celular: '' })} className="text-indigo-600 text-sm font-semibold">+ Añadir Contacto</button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">3. Formulario de Estudios</h2>
        {employeeData.estudios.map((est, i) => (
             <div key={i} className="border p-4 rounded-md mb-4 space-y-4 relative">
                <button type="button" onClick={() => removeNestedItem(i, 'estudios')} className="absolute top-2 right-2 text-red-500 p-2 font-bold hover:bg-red-100 rounded-full leading-none">X</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nivel</label>
                        <select 
                          name="nivel" 
                          value={est.nivel} 
                          onChange={(e) => handleNestedChange(i, e, 'estudios')} 
                          className={`${inputStyles} ${errors[`estudios_${i}_nivel`] ? 'border-red-500' : 'border-gray-300'}`}
                        >
                            <option value="primaria">Primaria</option>
                            <option value="secundaria">Secundaria</option>
                            <option value="tecnico">Técnico</option>
                            <option value="universitario">Universitario</option>
                            <option value="posgrado">Postgrado</option>
                            <option value="curso">Curso</option>
                            <option value="otro">Otro</option>
                        </select>
                        {errors[`estudios_${i}_nivel`] && <p className="mt-1 text-xs text-red-500">{errors[`estudios_${i}_nivel`]}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Estado</label>
                        <select 
                          name="estado" 
                          value={est.estado} 
                          onChange={(e) => handleNestedChange(i, e, 'estudios')} 
                          className={`${inputStyles} ${errors[`estudios_${i}_estado`] ? 'border-red-500' : 'border-gray-300'}`}
                        >
                            <option value="concluido">Concluido</option>
                            <option value="cursando">Cursando</option>
                            <option value="inconcluso">Inconcluso</option>
                        </select>
                        {errors[`estudios_${i}_estado`] && <p className="mt-1 text-xs text-red-500">{errors[`estudios_${i}_estado`]}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Institución</label>
                        <input 
                          type="text" 
                          name="institucion" 
                          value={est.institucion} 
                          onChange={(e) => handleNestedChange(i, e, 'estudios')} 
                          className={`${inputStyles} ${errors[`estudios_${i}_institucion`] ? 'border-red-500' : 'border-gray-300'}`} 
                        />
                        {errors[`estudios_${i}_institucion`] && <p className="mt-1 text-xs text-red-500">{errors[`estudios_${i}_institucion`]}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Carrera / Título</label>
                        <input 
                          type="text" 
                          name="carrera" 
                          value={est.carrera} 
                          onChange={(e) => handleNestedChange(i, e, 'estudios')} 
                          className={`${inputStyles} ${errors[`estudios_${i}_carrera`] ? 'border-red-500' : 'border-gray-300'}`} 
                        />
                        {errors[`estudios_${i}_carrera`] && <p className="mt-1 text-xs text-red-500">{errors[`estudios_${i}_carrera`]}</p>}
                    </div>
                </div>
            </div>
        ))}
        <button type="button" onClick={() => addNestedItem('estudios', { nivel: 'secundaria', carrera: '', institucion: '', estado: 'concluido' })} className="text-indigo-600 text-sm font-semibold">+ Añadir Estudio</button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">4. Información Laboral y Contratos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
                <label htmlFor="fecha_ingreso_inicial" className="block text-sm font-medium text-gray-700">Fecha Ingreso Inicial</label>
                <input type="date" id="fecha_ingreso_inicial" name="fecha_ingreso_inicial" value={employeeData.fecha_ingreso_inicial} onChange={handleChange} className={`${inputStyles} ${errors.fecha_ingreso_inicial ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.fecha_ingreso_inicial && <p className="mt-1 text-xs text-red-500">{errors.fecha_ingreso_inicial}</p>}
            </div>
            <div>
              <SearchableSelect 
                label="Departamento (Sector)" 
                options={departamentos} 
                selected={departamentos.find(d => d.id === employeeData.departamento) || null} 
                onChange={(option) => handleSelectChange('departamento', option as Option)} 
              />
              {errors.departamento && <p className="mt-1 text-xs text-red-500">{errors.departamento}</p>}
            </div>
            <div>
              <SearchableSelect 
                label="Cargo" 
                options={cargos} 
                selected={cargos.find(c => c.id === employeeData.cargo) || null} 
                onChange={(option) => handleSelectChange('cargo', option as Option)} 
              />
              {errors.cargo && <p className="mt-1 text-xs text-red-500">{errors.cargo}</p>}
            </div>
            <div className="md:col-span-3">
              <label htmlFor="jefe" className="block text-sm font-medium text-gray-700">Jefe Inmediato</label>
              <select id="jefe" name="jefe" value={employeeData.jefe || ''} onChange={handleChange} className={`${inputStyles} ${errors.jefe ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="">Seleccionar...</option>
                {jefes.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
              </select>
              {errors.jefe && <p className="mt-1 text-xs text-red-500">{errors.jefe}</p>}
            </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-600 mb-4">Contratos</h3>
        {employeeData.contratos.map((con, i) => (
            <div key={i} className="border p-4 rounded-md mb-4 space-y-4 relative">
                <button type="button" onClick={() => removeNestedItem(i, 'contratos')} className="absolute top-2 right-2 text-red-500 p-2 font-bold hover:bg-red-100 rounded-full leading-none">X</button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo Contrato</label>
                        <select 
                          name="tipo_contrato" 
                          value={con.tipo_contrato} 
                          onChange={(e) => handleNestedChange(i, e, 'contratos')} 
                          className={`${inputStyles} ${errors[`contratos_${i}_tipo_contrato`] ? 'border-red-500' : 'border-gray-300'}`}
                        >
                            <option value="plazo_fijo">Plazo Fijo</option>
                            <option value="indefinido">Indefinido</option>
                            <option value="eventual">Eventual</option>
                            <option value="temporal">Temporal</option>
                        </select>
                        {errors[`contratos_${i}_tipo_contrato`] && <p className="mt-1 text-xs text-red-500">{errors[`contratos_${i}_tipo_contrato`]}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo Trabajador</label>
                        <select 
                          name="tipo_trabajador" 
                          value={con.tipo_trabajador} 
                          onChange={(e) => handleNestedChange(i, e, 'contratos')} 
                          className={`${inputStyles} ${errors[`contratos_${i}_tipo_trabajador`] ? 'border-red-500' : 'border-gray-300'}`}
                        >
                            <option value="eventual">Eventual</option>
                            <option value="permanente">Permanente</option>
                            <option value="consultor">Consultor</option>
                            <option value="pasante">Pasante</option>
                        </select>
                        {errors[`contratos_${i}_tipo_trabajador`] && <p className="mt-1 text-xs text-red-500">{errors[`contratos_${i}_tipo_trabajador`]}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Jornada Laboral</label>
                        <select 
                          name="jornada_laboral" 
                          value={con.jornada_laboral} 
                          onChange={(e) => handleNestedChange(i, e, 'contratos')} 
                          className={`${inputStyles} ${errors[`contratos_${i}_jornada_laboral`] ? 'border-red-500' : 'border-gray-300'}`}
                        >
                            <option value="tiempo_completo">Tiempo Completo</option>
                            <option value="medio_tiempo">Medio Tiempo</option>
                            <option value="turnos">Turnos</option>
                        </select>
                        {errors[`contratos_${i}_jornada_laboral`] && <p className="mt-1 text-xs text-red-500">{errors[`contratos_${i}_jornada_laboral`]}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Salario Base</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          name="salario_base" 
                          value={con.salario_base} 
                          onChange={(e) => handleNestedChange(i, e, 'contratos')} 
                          className={`${inputStyles} ${errors[`contratos_${i}_salario_base`] ? 'border-red-500' : 'border-gray-300'}`} 
                        />
                        {errors[`contratos_${i}_salario_base`] && <p className="mt-1 text-xs text-red-500">{errors[`contratos_${i}_salario_base`]}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                        <input 
                          type="date" 
                          name="fecha_inicio" 
                          value={con.fecha_inicio} 
                          onChange={(e) => handleNestedChange(i, e, 'contratos')} 
                          className={`${inputStyles} ${errors[`contratos_${i}_fecha_inicio`] ? 'border-red-500' : 'border-gray-300'}`} 
                        />
                        {errors[`contratos_${i}_fecha_inicio`] && <p className="mt-1 text-xs text-red-500">{errors[`contratos_${i}_fecha_inicio`]}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha Fin Pactada</label>
                        <input 
                          type="date" 
                          name="fecha_fin_pactada" 
                          value={con.fecha_fin_pactada} 
                          onChange={(e) => handleNestedChange(i, e, 'contratos')} 
                          className={`${inputStyles} ${errors[`contratos_${i}_fecha_fin_pactada`] ? 'border-red-500' : 'border-gray-300'}`} 
                        />
                        {errors[`contratos_${i}_fecha_fin_pactada`] && <p className="mt-1 text-xs text-red-500">{errors[`contratos_${i}_fecha_fin_pactada`]}</p>}
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700">Contrato Fiscal</label>
                        <select 
                          name="contrato_fiscal" 
                          value={con.contrato_fiscal} 
                          onChange={(e) => handleNestedChange(i, e, 'contratos')} 
                          className={`${inputStyles} ${errors[`contratos_${i}_contrato_fiscal`] ? 'border-red-500' : 'border-gray-300'}`}
                        >
                            <option value="avicola">Avicola Rolon S.R.L</option>
                            <option value="ovoplus">Ovoplus S.R.L</option>
                            <option value="soya_cruz">Soya Cruz S.R.L</option>
                            <option value="opticargo">Opticargo S.R.L</option>
                            <option value="rau_rimski">RAU Rimki Cesar Ariel Rolon Rios</option>
                            <option value="rau_nashira">RAU Nashira Orellana Rolon</option>
                            <option value="rau_silvia">RAU Silvia Catusha Rolon Rios</option>
                        </select>
                        {errors[`contratos_${i}_contrato_fiscal`] && <p className="mt-1 text-xs text-red-500">{errors[`contratos_${i}_contrato_fiscal`]}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Estado Contrato</label>
                        <select 
                          name="estado_contrato" 
                          value={con.estado_contrato} 
                          onChange={(e) => handleNestedChange(i, e, 'contratos')} 
                          className={`${inputStyles} ${errors[`contratos_${i}_estado_contrato`] ? 'border-red-500' : 'border-gray-300'}`}
                        >
                            <option value="vigente">Vigente</option>
                            <option value="finalizado">Finalizado</option>
                            <option value="anulado">Anulado</option>
                        </select>
                        {errors[`contratos_${i}_estado_contrato`] && <p className="mt-1 text-xs text-red-500">{errors[`contratos_${i}_estado_contrato`]}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                        <textarea 
                          name="observaciones" 
                          value={con.observaciones} 
                          onChange={(e) => handleNestedChange(i, e, 'contratos')} 
                          className={`${inputStyles} ${errors[`contratos_${i}_observaciones`] ? 'border-red-500' : 'border-gray-300'}`} 
                          rows={2}
                        ></textarea>
                        {errors[`contratos_${i}_observaciones`] && <p className="mt-1 text-xs text-red-500">{errors[`contratos_${i}_observaciones`]}</p>}
                    </div>
                </div>
            </div>
        ))}
        <button type="button" onClick={() => addNestedItem('contratos', { tipo_contrato: 'indefinido', tipo_trabajador: 'permanente', contrato_fiscal: 'avicola', fecha_inicio: '', fecha_fin_pactada: '', salario_base: '0', jornada_laboral: 'tiempo_completo', estado_contrato: 'vigente', observaciones: '' })} className="text-indigo-600 text-sm font-semibold">+ Añadir Contrato</button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">5. Documentos y Foto</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
                <label htmlFor="foto" className="block text-sm font-medium text-gray-700">Foto de Perfil</label>
                <input type="file" id="foto" name="foto" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                {errors.foto && <p className="mt-1 text-xs text-red-500">{errors.foto}</p>}
            </div>
            {documentFields.map(({ key, label }) => (
                <div key={key}>
                    <label htmlFor={key} className="block text-sm font-medium text-gray-700">{label}</label>
                    <input type="file" id={key} name={key} onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                    {errors[key] && <p className="mt-1 text-xs text-red-500">{errors[key]}</p>}
                </div>
            ))}
        </div>
        {isEditing && (
            <>
                <hr className="my-8" />
                <h3 className="text-lg font-semibold text-gray-600 mb-4">Documentos Subidos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {documentFields.map(({ key, label }) => {
                        const fileUrl = (employeeData as any)[key];
                        if (fileUrl) {
                            const fullUrl = fileUrl.startsWith('http://') || fileUrl.startsWith('https://') 
                                ? fileUrl 
                                : `http://127.0.0.1:8000${fileUrl}`;
                            return (
                                <a key={key} href={fullUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline p-3 bg-gray-50 rounded-md truncate">
                                    Ver {label}
                                </a>
                            );
                        }
                        return null;
                    })}
                </div>
                {documentFields.every(({ key }) => !(employeeData as any)[key]) && (
                    <p className="text-sm text-gray-500">No hay documentos subidos para este empleado.</p>
                )}
            </>
        )}
      </div>
    </form>
  );
};