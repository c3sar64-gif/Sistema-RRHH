// src/pages/EmployeeFormPage.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { SearchableSelect } from '../components/SearchableSelect';

// --- Interfaces ---
interface Option { id: number; nombre: string; }
interface EmpleadoSimple { id: number; nombres: string; apellido_paterno: string; nombre: string; }
interface Familiar { id?: number; nombre_completo: string; parentesco: string; celular: string; }
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
  direccion: '', tipo_vivienda: 'A', nacionalidad: 'Boliviana',
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        axios.defaults.baseURL = 'http://127.0.0.1:8000';
        
        const cargosRes = await axios.get('/api/cargos/', { headers: { 'Authorization': `Token ${token}` } });
        setCargos(cargosRes.data);

        const deptosRes = await axios.get('/api/departamentos/', { headers: { 'Authorization': `Token ${token}` } });
        setDepartamentos(deptosRes.data);

        const empleadosRes = await axios.get('/api/empleados/', { headers: { 'Authorization': `Token ${token}` } });
        const jefesData = empleadosRes.data.map((e: EmpleadoSimple) => ({...e, nombre: `${e.nombres} ${e.apellido_paterno}`}));
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
  };

  const handleSelectChange = (name: 'cargo' | 'departamento' | 'jefe', option: Option | null) => { 
    setEmployeeData(prev => ({ ...prev, [name]: option ? option.id : null })); 
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => { const { name, files: inputFiles } = e.target; if (inputFiles && inputFiles.length > 0) { setFiles(prev => ({ ...prev, [name]: inputFiles[0] })); } };
  const handleNestedChange = (index: number, e: ChangeEvent<HTMLInputElement | HTMLSelectElement>, section: 'familiares' | 'estudios' | 'contratos') => { const { name, value } = e.target; const list = [...(employeeData as any)[section]]; (list[index] as any)[name] = value; setEmployeeData(prev => ({ ...prev, [section]: list })); };
  const addNestedItem = (section: 'familiares' | 'estudios' | 'contratos', defaultItem: any) => { setEmployeeData(prev => ({ ...prev, [section]: [...(prev as any)[section], defaultItem] })); };
  const removeNestedItem = (index: number, section: 'familiares' | 'estudios' | 'contratos') => { setEmployeeData(prev => ({ ...prev, [section]: (prev as any)[section].filter((_: any, i: number) => i !== index)})); };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    Object.entries(employeeData).forEach(([key, value]) => {
      if (!['familiares', 'estudios', 'contratos'].includes(key) && value !== '' && value !== null) {
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
      await axios({ method, url, data: formData, headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Token ${token}` } });
      navigate('/empleados');
    } catch (err: any) { setError(`Error al guardar: ${JSON.stringify(err.response?.data)}`); } 
    finally { setLoading(false); }
  };
  
  if (loading) return <div>Cargando formulario...</div>;
  if (error) return <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>;

  const inputStyles = "mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";
  
  const hijos = employeeData.familiares.filter(f => f.parentesco === 'hijo/a');
  const contactos = employeeData.familiares.filter(f => f.parentesco !== 'hijo/a');
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
            {employeeData.foto ? ( <img src={`http://127.0.0.1:8000${employeeData.foto}`} alt="Foto de perfil" className="h-32 w-32 rounded-full object-cover border-4 border-gray-200"/> ) : ( <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">Sin Foto</div> )}
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
            <div><label className="block text-sm font-medium text-gray-700">Nombres</label><input type="text" name="nombres" value={employeeData.nombres} onChange={handleChange} className={inputStyles} required /></div>
            <div><label className="block text-sm font-medium text-gray-700">Apellido Paterno</label><input type="text" name="apellido_paterno" value={employeeData.apellido_paterno} onChange={handleChange} className={inputStyles} required /></div>
            <div><label className="block text-sm font-medium text-gray-700">Apellido Materno</label><input type="text" name="apellido_materno" value={employeeData.apellido_materno} onChange={handleChange} className={inputStyles} /></div>
            <div><label className="block text-sm font-medium text-gray-700">CI</label><input type="text" name="ci" value={employeeData.ci} onChange={handleChange} className={inputStyles} required/></div>
            <div><label className="block text-sm font-medium text-gray-700">Fecha de Nacimiento</label><input type="date" name="fecha_nacimiento" value={employeeData.fecha_nacimiento} onChange={handleChange} className={inputStyles} /></div>
            <div><label className="block text-sm font-medium text-gray-700">Sexo</label><select name="sexo" value={employeeData.sexo} onChange={handleChange} className={inputStyles}><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700">Estado Civil</label><select name="estado_civil" value={employeeData.estado_civil} onChange={handleChange} className={inputStyles}><option value="S">Soltero(a)</option><option value="C">Casado(a)</option><option value="V">Viudo(a)</option><option value="D">Divorciado(a)</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700">Celular</label><input type="tel" name="celular" value={employeeData.celular} onChange={handleChange} className={inputStyles} /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" name="email" value={employeeData.email} onChange={handleChange} className={inputStyles} /></div>
            <div><label className="block text-sm font-medium text-gray-700">Provincia</label><input type="text" name="provincia" value={employeeData.provincia} onChange={handleChange} className={inputStyles} /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Dirección</label><input type="text" name="direccion" value={employeeData.direccion} onChange={handleChange} className={inputStyles} /></div>
            <div><label className="block text-sm font-medium text-gray-700">Tipo de Vivienda</label><select name="tipo_vivienda" value={employeeData.tipo_vivienda} onChange={handleChange} className={inputStyles}><option value="P">Propia</option><option value="A">Alquilada</option><option value="F">Familiar</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700">Nacionalidad</label><input type="text" name="nacionalidad" value={employeeData.nacionalidad} onChange={handleChange} className={inputStyles} /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Nombre de Cónyuge</label><input type="text" name="nombre_conyuge" value={employeeData.nombre_conyuge} onChange={handleChange} className={inputStyles} /></div>
            <div className="flex items-center pt-6"><input type="checkbox" name="tiene_hijos" checked={employeeData.tiene_hijos} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600" /><label className="ml-2 block text-sm font-medium text-gray-900">¿Tiene Hijos?</label></div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">2. Información Familiar</h2>
        <h3 className="text-lg font-semibold text-gray-600 mb-4 mt-6">Hijos</h3>
        {employeeData.tiene_hijos && <div className="space-y-4">
            <table className="min-w-full divide-y divide-gray-200 mb-4">
                <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre Completo</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Celular</th><th className="w-10"></th></tr></thead>
                <tbody>{employeeData.familiares.filter(f => f.parentesco === 'hijo/a').map((h, i) => <tr key={i}>
                    <td><input type="text" name="nombre_completo" value={h.nombre_completo} onChange={(e) => handleNestedChange(employeeData.familiares.indexOf(h), e, 'familiares')} className={inputStyles} /></td>
                    <td><input type="text" name="celular" value={h.celular} onChange={(e) => handleNestedChange(employeeData.familiares.indexOf(h), e, 'familiares')} className={inputStyles} /></td>
                    <td><button type="button" onClick={() => removeNestedItem(employeeData.familiares.indexOf(h), 'familiares')} className="text-red-500 p-2 rounded-full hover:bg-red-100">X</button></td>
                </tr>)}</tbody>
            </table>
            <button type="button" onClick={() => addNestedItem('familiares', { nombre_completo: '', parentesco: 'hijo/a', celular: '' })} className="text-indigo-600 text-sm font-semibold">+ Añadir Hijo</button>
        </div>}
        <h3 className="text-lg font-semibold text-gray-600 mb-4 mt-8">Contactos de Emergencia</h3>
        <table className="min-w-full divide-y divide-gray-200 mb-4">
            <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre Completo</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parentesco</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Celular</th><th className="w-10"></th></tr></thead>
            <tbody>{employeeData.familiares.filter(f => f.parentesco !== 'hijo/a').map((c, i) => <tr key={i}>
                <td><input type="text" name="nombre_completo" value={c.nombre_completo} onChange={(e) => handleNestedChange(employeeData.familiares.indexOf(c), e, 'familiares')} className={inputStyles} /></td>
                <td><select name="parentesco" value={c.parentesco} onChange={(e) => handleNestedChange(employeeData.familiares.indexOf(c), e, 'familiares')} className={inputStyles}><option value="">Seleccionar...</option><option value="padre">Padre</option><option value="madre">Madre</option><option value="esposo/a">Esposo/a</option><option value="hermano/a">Hermano/a</option><option value="hijo/a">Hijo/a</option><option value="otro">Otro</option></select></td>
                <td><input type="text" name="celular" value={c.celular} onChange={(e) => handleNestedChange(employeeData.familiares.indexOf(c), e, 'familiares')} className={inputStyles} /></td>
                <td><button type="button" onClick={() => removeNestedItem(employeeData.familiares.indexOf(c), 'familiares')} className="text-red-500 p-2 rounded-full hover:bg-red-100">X</button></td>
            </tr>)}</tbody>
        </table>
        <button type="button" onClick={() => addNestedItem('familiares', { nombre_completo: '', parentesco: 'otro', celular: '' })} className="text-indigo-600 text-sm font-semibold">+ Añadir Contacto</button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">3. Formulario de Estudios</h2>
        {employeeData.estudios.map((est, i) => (
             <div key={i} className="border p-4 rounded-md mb-4 space-y-4 relative">
                <button type="button" onClick={() => removeNestedItem(i, 'estudios')} className="absolute top-2 right-2 text-red-500 p-2 font-bold hover:bg-red-100 rounded-full leading-none">X</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">Nivel</label><select name="nivel" value={est.nivel} onChange={(e) => handleNestedChange(i, e, 'estudios')} className={inputStyles}><option value="primaria">Primaria</option><option value="secundaria">Secundaria</option><option value="tecnico">Técnico</option><option value="universitario">Universitario</option><option value="posgrado">Postgrado</option><option value="curso">Curso</option><option value="otro">Otro</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700">Estado</label><select name="estado" value={est.estado} onChange={(e) => handleNestedChange(i, e, 'estudios')} className={inputStyles}><option value="concluido">Concluido</option><option value="cursando">Cursando</option><option value="inconcluso">Inconcluso</option></select></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Institución</label><input type="text" name="institucion" value={est.institucion} onChange={(e) => handleNestedChange(i, e, 'estudios')} className={inputStyles} /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Carrera / Título</label><input type="text" name="carrera" value={est.carrera} onChange={(e) => handleNestedChange(i, e, 'estudios')} className={inputStyles} /></div>
                </div>
            </div>
        ))}
        <button type="button" onClick={() => addNestedItem('estudios', { nivel: 'secundaria', carrera: '', institucion: '', estado: 'concluido' })} className="text-indigo-600 text-sm font-semibold">+ Añadir Estudio</button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">4. Información Laboral y Contratos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div><label className="block text-sm font-medium text-gray-700">Fecha Ingreso Inicial</label><input type="date" name="fecha_ingreso_inicial" value={employeeData.fecha_ingreso_inicial} onChange={handleChange} className={inputStyles} /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Departamento (Sector)</label>
              <select name="departamento" value={employeeData.departamento || ''} onChange={handleChange} className={inputStyles}>
                <option value="">Seleccionar...</option>
                {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <SearchableSelect label="Cargo" options={cargos} selected={cargos.find(c => c.id === employeeData.cargo) || null} onChange={(option) => handleSelectChange('cargo', option as Option)} />
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Jefe Inmediato</label>
              <select name="jefe" value={employeeData.jefe || ''} onChange={handleChange} className={inputStyles}>
                <option value="">Seleccionar...</option>
                {jefes.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
              </select>
            </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-600 mb-4">Contratos</h3>
        {employeeData.contratos.map((con, i) => (
            <div key={i} className="border p-4 rounded-md mb-4 space-y-4 relative">
                <button type="button" onClick={() => removeNestedItem(i, 'contratos')} className="absolute top-2 right-2 text-red-500 p-2 font-bold hover:bg-red-100 rounded-full leading-none">X</button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">Tipo Contrato</label><select name="tipo_contrato" value={con.tipo_contrato} onChange={(e) => handleNestedChange(i, e, 'contratos')} className={inputStyles}><option value="plazo_fijo">Plazo Fijo</option><option value="indefinido">Indefinido</option><option value="eventual">Eventual</option><option value="temporal">Temporal</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700">Tipo Trabajador</label><select name="tipo_trabajador" value={con.tipo_trabajador} onChange={(e) => handleNestedChange(i, e, 'contratos')} className={inputStyles}><option value="eventual">Eventual</option><option value="permanente">Permanente</option><option value="consultor">Consultor</option><option value="pasante">Pasante</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700">Jornada Laboral</label><select name="jornada_laboral" value={con.jornada_laboral} onChange={(e) => handleNestedChange(i, e, 'contratos')} className={inputStyles}><option value="tiempo_completo">Tiempo Completo</option><option value="medio_tiempo">Medio Tiempo</option><option value="turnos">Turnos</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700">Salario Base</label><input type="number" step="0.01" name="salario_base" value={con.salario_base} onChange={(e) => handleNestedChange(i, e, 'contratos')} className={inputStyles} /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Fecha Inicio</label><input type="date" name="fecha_inicio" value={con.fecha_inicio} onChange={(e) => handleNestedChange(i, e, 'contratos')} className={inputStyles} /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Fecha Fin Pactada</label><input type="date" name="fecha_fin_pactada" value={con.fecha_fin_pactada} onChange={(e) => handleNestedChange(i, e, 'contratos')} className={inputStyles} /></div>
                    <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700">Contrato Fiscal</label><select name="contrato_fiscal" value={con.contrato_fiscal} onChange={(e) => handleNestedChange(i, e, 'contratos')} className={inputStyles}><option value="avicola">Avicola Rolon S.R.L</option><option value="ovoplus">Ovoplus S.R.L</option><option value="soya_cruz">Soya Cruz S.R.L</option><option value="opticargo">Opticargo S.R.L</option><option value="rau_rimski">RAU Rimki Cesar Ariel Rolon Rios</option><option value="rau_nashira">RAU Nashira Orellana Rolon</option><option value="rau_silvia">RAU Silvia Catusha Rolon Rios</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700">Estado Contrato</label><select name="estado_contrato" value={con.estado_contrato} onChange={(e) => handleNestedChange(i, e, 'contratos')} className={inputStyles}><option value="vigente">Vigente</option><option value="finalizado">Finalizado</option><option value="anulado">Anulado</option></select></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Observaciones</label><textarea name="observaciones" value={con.observaciones} onChange={(e) => handleNestedChange(i, e, 'contratos')} className={inputStyles} rows={2}></textarea></div>
                </div>
            </div>
        ))}
        <button type="button" onClick={() => addNestedItem('contratos', { tipo_contrato: 'indefinido', tipo_trabajador: 'permanente', contrato_fiscal: 'avicola', fecha_inicio: '', fecha_fin_pactada: '', salario_base: '0', jornada_laboral: 'tiempo_completo', estado_contrato: 'vigente', observaciones: '' })} className="text-indigo-600 text-sm font-semibold">+ Añadir Contrato</button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">5. Documentos y Foto</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className="block text-sm font-medium text-gray-700">Foto de Perfil</label><input type="file" name="foto" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/></div>
            {documentFields.map(({ key, label }) => (
                <div key={key}><label className="block text-sm font-medium text-gray-700">{label}</label><input type="file" name={key} onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/></div>
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
                            return (
                                <a key={key} href={`http://127.0.0.1:8000${fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline p-3 bg-gray-50 rounded-md truncate">
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