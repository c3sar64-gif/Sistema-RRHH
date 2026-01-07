import { useState, useEffect } from 'react';
import axios from 'axios';

// --- Interfaces & Choices (could be moved to a separate file) ---
interface Departamento { id: number; nombre: string; }
interface Cargo { id: number; nombre: string; }
interface EmpleadoForList { id: number; nombres: string; apellido_paterno: string; }
interface Familiar { id?: number; nombre_completo: string; parentesco: string; celular: string; activo: boolean; }
interface Estudio { id?: number; nivel: string; carrera: string; institucion: string; estado: string; activo: boolean; }
interface Contrato { id?: number; tipo_contrato: string; tipo_trabajador: string; contrato_fiscal: string; fecha_inicio: string; fecha_fin: string | null; fecha_fin_pactada: string | null; salario_base: string; jornada_laboral: string; estado_contrato: string; observaciones: string; }

// --- Choice options matching backend ---
const SEXO_CHOICES = [{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }];
const ESTADO_CIVIL_CHOICES = [{ value: 'S', label: 'Soltero(a)' }, { value: 'C', label: 'Casado(a)' }, { value: 'D', label: 'Divorciado(a)' }, { value: 'V', label: 'Viudo(a)' }];
const TIPO_VIVIENDA_CHOICES = [{ value: 'P', label: 'Propia' }, { value: 'A', label: 'Alquilada' }, { value: 'F', label: 'Familiar' }];
const PARENTESCO_CHOICES = [{ value: 'padre', label: 'Padre' }, { value: 'madre', label: 'Madre' }, { value: 'esposo/a', label: 'Esposo(a)' }, { value: 'hermano/a', label: 'Hermano/a' }, { value: 'hijo/a', label: 'Hijo/a' }, { value: 'otro', label: 'Otro' }];
const NIVEL_ESTUDIO_CHOICES = [{ value: 'primaria', label: 'Primaria' }, { value: 'secundaria', label: 'Secundaria' }, { value: 'tecnico', label: 'Técnico' }, { value: 'universitario', label: 'Universitario' }, { value: 'posgrado', label: 'Posgrado' }, { value: 'curso', label: 'Curso' }, { value: 'otro', label: 'Otro' }];
const ESTADO_ESTUDIO_CHOICES = [{ value: 'concluido', label: 'Concluido' }, { value: 'cursando', label: 'Cursando' }, { value: 'inconcluso', label: 'Inconcluso' }];
const TIPO_CONTRATO_CHOICES = [{ value: 'plazo_fijo', label: 'Plazo Fijo' }, { value: 'indefinido', label: 'Indefinido' }, { value: 'eventual', label: 'Eventual' }, { value: 'temporal', label: 'Temporal' }];
const TIPO_TRABAJADOR_CHOICES = [{ value: 'eventual', label: 'Eventual' }, { value: 'permanente', label: 'Permanente' }, { value: 'consultor', label: 'Consultor' }, { value: 'pasante', label: 'Pasante' }];
const CONTRATO_FISCAL_CHOICES = [{ value: 'avicola', label: 'Avicola Rolon S.R.L' }, { value: 'ovoplus', label: 'Ovoplus S.R.L' }, { value: 'soya_cruz', label: 'Soya Cruz S.R.L' }, { value: 'opticargo', label: 'Opticargo S.R.L' }, { value: 'rau_rimski', label: 'RAU Rimski Cesar Ariel Rolon Rios' }, { value: 'rau_nashira', label: 'RAU Nashira Orellana Rolon' }, { value: 'rau_silvia', label: 'RAU Silvia Catusha Rolon Rios' }];
const JORNADA_LABORAL_CHOICES = [{ value: 'tiempo_completo', label: 'Tiempo Completo' }, { value: 'medio_tiempo', label: 'Medio Tiempo' }, { value: 'turnos', label: 'Turnos' }];
const ESTADO_CONTRATO_CHOICES = [{ value: 'vigente', label: 'Vigente' }, { value: 'finalizado', label: 'Finalizado' }, { value: 'anulado', label: 'Anulado' }];

const initialFormData = {
    nombres: '', apellido_paterno: '', apellido_materno: '', ci: '', fecha_nacimiento: '', sexo: 'M',
    estado_civil: 'S', celular: '', email: '', provincia: '', direccion: '', tipo_vivienda: 'P',
    nacionalidad: 'Boliviana', nombre_conyuge: '', tiene_hijos: false,
    fecha_ingreso_inicial: '', cargo: '', departamento: '', jefe: '',
    fotocopia_ci: null, curriculum_vitae: null, certificado_antecedentes: null,
    fotocopia_luz_agua_gas: null, croquis_domicilio: null, fotocopia_licencia_conducir: null,
    familiares: [], estudios: [], contratos: []
};

// --- Main Form Component ---
function EmployeeForm({ onFormSubmit, employeeId }: { onFormSubmit: () => void, employeeId: number | null }) {
    const isEditMode = employeeId !== null;
    const [formData, setFormData] = useState<any>(initialFormData);
    const [dropdownData, setDropdownData] = useState({
        departamentos: [] as Departamento[],
        cargos: [] as Cargo[],
        jefes: [] as EmpleadoForList[],
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchSupportData = async () => {
            setLoading(true);
            try {
                const [depts, cargos, empleados] = await Promise.all([
                    axios.get('http://127.0.0.1:8000/api/departamentos/'),
                    axios.get('http://127.0.0.1:8000/api/cargos/'),
                    axios.get('http://127.0.0.1:8000/api/empleados/')
                ]);
                
                // Exclude the current employee from the list of potential bosses in edit mode
                const potentialJefes = employeeId
                    ? empleados.data.filter((e: any) => e.id !== employeeId)
                    : empleados.data;

                setDropdownData({
                    departamentos: depts.data,
                    cargos: cargos.data,
                    jefes: potentialJefes.map((e: any) => ({ id: e.id, nombres: e.nombres, apellido_paterno: e.apellido_paterno }))
                });
            } catch (err) {
                setError('Failed to load required data for the form.');
            }
            setLoading(false);
        };
        fetchSupportData();
    }, [employeeId]); // Refetch if employeeId changes (to update bosses list)

    useEffect(() => {
        const fetchEmployeeData = async () => {
            if (isEditMode) {
                setLoading(true);
                try {
                    const response = await axios.get(`http://127.0.0.1:8000/api/empleados/${employeeId}/`);
                    // Sanitize incoming data to match form state
                    const data = response.data;
                    const sanitizedData = {
                        ...initialFormData,
                        ...data,
                        cargo: data.cargo || '',
                        departamento: data.departamento || '',
                        jefe: data.jefe || '',
                        // Files are not re-populated, user must re-upload if they want to change them
                    };
                    setFormData(sanitizedData);
                } catch (err) {
                    setError('Failed to load employee data for editing.');
                }
                setLoading(false);
            } else {
                setFormData(initialFormData); // Reset for create mode
            }
        };
        fetchEmployeeData();
    }, [employeeId, isEditMode]);


    // --- Handlers (similar to before) ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData({ ...formData, [name]: checked });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            setFormData({ ...formData, [name]: files[0] });
        }
    };
    const addToList = (listName: 'familiares' | 'estudios' | 'contratos', emptyItem: any) => {
        setFormData({ ...formData, [listName]: [...formData[listName], emptyItem] });
    };
    const handleListInputChange = (listName: string, index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const list = [...formData[listName]];
        list[index] = { ...list[index], [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value };
        setFormData({ ...formData, [listName]: list });
    };
    const removeFromList = (listName: string, index: number) => {
        const list = [...formData[listName]];
        list.splice(index, 1);
        setFormData({ ...formData, [listName]: list });
    };
    
    // --- Submit Logic ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const submissionData = new FormData();
        Object.keys(formData).forEach(key => {
            const value = formData[key];
            if (key === 'familiares' || key === 'estudios' || key === 'contratos') {
                submissionData.append(key, JSON.stringify(value));
            } else if (value instanceof File) {
                submissionData.append(key, value, value.name);
            } else if (value !== null && value !== '') {
                submissionData.append(key, value);
            }
        });

        const url = isEditMode
            ? `http://127.0.0.1:8000/api/empleados/${employeeId}/`
            : 'http://127.0.0.1:8000/api/empleados/';
        
        // For FormData with PUT, we send it as a POST but the backend serializer handles it.
        // Or better, use a specific axios call.
        const method = isEditMode ? 'put' : 'post';

        try {
            await axios({
                method: method,
                url: url,
                data: submissionData,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onFormSubmit();
        } catch (err: any) {
            console.error("Submission failed:", err);
            if (err.response) {
                console.error('Validation errors:', err.response.data);
                setError(`Failed to submit: ${JSON.stringify(err.response.data)}`);
            } else {
                setError('An unexpected error occurred. Check console for details.');
            }
        }
    };

    if (loading) return <p>Loading form...</p>;

    // --- Render ---
    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '900px', margin: 'auto' }}>
            <h2>{isEditMode ? 'Edit Employee' : 'Create New Employee'}</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            
            {/* --- Personal Info Section --- */}
            <fieldset>
                <legend>Información Personal</legend>
                <input name="nombres" value={formData.nombres} onChange={handleInputChange} placeholder="Nombres" required />
                <input name="apellido_paterno" value={formData.apellido_paterno} onChange={handleInputChange} placeholder="Apellido Paterno" required />
                <input name="apellido_materno" value={formData.apellido_materno} onChange={handleInputChange} placeholder="Apellido Materno" />
                <input name="ci" value={formData.ci} onChange={handleInputChange} placeholder="CI" required />
                <input name="fecha_nacimiento" type="date" value={formData.fecha_nacimiento} onChange={handleInputChange} required />
                <select name="sexo" value={formData.sexo} onChange={handleInputChange}>{SEXO_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                <select name="estado_civil" value={formData.estado_civil} onChange={handleInputChange}>{ESTADO_CIVIL_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="Celular" required />
                <input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Email" required />
                <input name="provincia" value={formData.provincia} onChange={handleInputChange} placeholder="Provincia" />
                <input name="direccion" value={formData.direccion} onChange={handleInputChange} placeholder="Dirección" />
                <select name="tipo_vivienda" value={formData.tipo_vivienda} onChange={handleInputChange}>{TIPO_VIVIENDA_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                <input name="nacionalidad" value={formData.nacionalidad} onChange={handleInputChange} placeholder="Nacionalidad" />
                <input name="nombre_conyuge" value={formData.nombre_conyuge} onChange={handleInputChange} placeholder="Nombre de Cónyuge" />
                <label><input name="tiene_hijos" type="checkbox" checked={formData.tiene_hijos} onChange={handleInputChange} /> Tiene Hijos?</label>
            </fieldset>

            {/* --- HR Info Section --- */}
            <fieldset>
                <legend>Información de RRHH</legend>
                <input name="fecha_ingreso_inicial" type="date" value={formData.fecha_ingreso_inicial} onChange={handleInputChange} required />
                <select name="departamento" value={formData.departamento} onChange={handleInputChange} required><option value="">Sector/Departamento</option>{dropdownData.departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select>
                <select name="cargo" value={formData.cargo} onChange={handleInputChange} required><option value="">Cargo</option>{dropdownData.cargos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                <select name="jefe" value={formData.jefe} onChange={handleInputChange}><option value="">Jefe Inmediato</option>{dropdownData.jefes.map(j => <option key={j.id} value={j.id}>{`${j.nombres} ${j.apellido_paterno}`}</option>)}</select>
            </fieldset>

            {/* --- Dynamic Familiares Section --- */}
            <fieldset>
                <legend>Familiares</legend>
                {formData.familiares.map((familiar: Familiar, index: number) => (
                    <div key={index}>
                        <input name="nombre_completo" value={familiar.nombre_completo} onChange={(e) => handleListInputChange('familiares', index, e)} placeholder="Nombre Completo" />
                        <select name="parentesco" value={familiar.parentesco} onChange={(e) => handleListInputChange('familiares', index, e)}>{PARENTESCO_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                        <input name="celular" value={familiar.celular} onChange={(e) => handleListInputChange('familiares', index, e)} placeholder="Celular" />
                        <label><input name="activo" type="checkbox" checked={familiar.activo} onChange={(e) => handleListInputChange('familiares', index, e)} /> Activo</label>
                        <button type="button" onClick={() => removeFromList('familiares', index)}>Eliminar</button>
                    </div>
                ))}
                <button type="button" onClick={() => addToList('familiares', { nombre_completo: '', parentesco: 'hijo/a', celular: '', activo: true })}>Añadir Familiar</button>
            </fieldset>

            {/* --- Dynamic Estudios Section --- */}
            <fieldset>
                <legend>Estudios</legend>
                 {formData.estudios.map((estudio: Estudio, index: number) => (
                    <div key={index}>
                        <select name="nivel" value={estudio.nivel} onChange={(e) => handleListInputChange('estudios', index, e)}>{NIVEL_ESTUDIO_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                        <input name="carrera" value={estudio.carrera} onChange={(e) => handleListInputChange('estudios', index, e)} placeholder="Carrera" />
                        <input name="institucion" value={estudio.institucion} onChange={(e) => handleListInputChange('estudios', index, e)} placeholder="Institución" />
                        <select name="estado" value={estudio.estado} onChange={(e) => handleListInputChange('estudios', index, e)}>{ESTADO_ESTUDIO_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                        <label><input name="activo" type="checkbox" checked={estudio.activo} onChange={(e) => handleListInputChange('estudios', index, e)} /> Activo</label>
                        <button type="button" onClick={() => removeFromList('estudios', index)}>Eliminar</button>
                    </div>
                ))}
                <button type="button" onClick={() => addToList('estudios', { nivel: 'universitario', carrera: '', institucion: '', estado: 'concluido', activo: true })}>Añadir Estudio</button>
            </fieldset>

            {/* --- Dynamic Contratos Section --- */}
            <fieldset>
                <legend>Contratos</legend>
                {formData.contratos.map((contrato: Contrato, index: number) => (
                    <div key={index}>
                        <select name="tipo_contrato" value={contrato.tipo_contrato} onChange={(e) => handleListInputChange('contratos', index, e)}>{TIPO_CONTRATO_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                        <input name="fecha_inicio" type="date" value={contrato.fecha_inicio} onChange={(e) => handleListInputChange('contratos', index, e)} />
                        <input name="salario_base" value={contrato.salario_base} onChange={(e) => handleListInputChange('contratos', index, e)} placeholder="Salario Base" />
                        {/* Add other contract fields as needed */}
                        <button type="button" onClick={() => removeFromList('contratos', index)}>Eliminar</button>
                    </div>
                ))}
                <button type="button" onClick={() => addToList('contratos', { tipo_contrato: 'indefinido', fecha_inicio: '', salario_base: '' })}>Añadir Contrato</button>
            </fieldset>

            {/* --- File Uploads Section --- */}
            <fieldset>
                <legend>Documentos</legend>
                <div><label>Fotocopia CI: <input name="fotocopia_ci" type="file" onChange={handleFileChange} /></label></div>
                <div><label>Curriculum Vitae: <input name="curriculum_vitae" type="file" onChange={handleFileChange} /></label></div>
                <div><label>Certificado de Antecedentes: <input name="certificado_antecedentes" type="file" onChange={handleFileChange} /></label></div>
                <div><label>Fotocopia Luz/Agua: <input name="fotocopia_luz_agua_gas" type="file" onChange={handleFileChange} /></label></div>
                <div><label>Croquis Domicilio: <input name="croquis_domicilio" type="file" onChange={handleFileChange} /></label></div>
                <div><label>Fotocopia Licencia Conducir: <input name="fotocopia_licencia_conducir" type="file" onChange={handleFileChange} /></label></div>
            </fieldset>

            <button type="submit" style={{ marginTop: '20px', padding: '10px 20px' }}>
                {isEditMode ? 'Update Employee' : 'Save Employee'}
            </button>
        </form>
    );
}

export default EmployeeForm;