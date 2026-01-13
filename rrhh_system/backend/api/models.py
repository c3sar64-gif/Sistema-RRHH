from django.db import models
from django.conf import settings

# Helper function to create upload paths for files
def employee_directory_path(instance, filename):
    # file will be uploaded to MEDIA_ROOT/empleado_<id>/<filename>
    return f'empleado_{instance.id}/{filename}'

# --- Choices ---

SEXO_CHOICES = [('M', 'Masculino'), ('F', 'Femenino')]
ESTADO_CIVIL_CHOICES = [('S', 'Soltero(a)'), ('C', 'Casado(a)'), ('D', 'Divorciado(a)'), ('V', 'Viudo(a)')]
TIPO_VIVIENDA_CHOICES = [('P', 'Propia'), ('A', 'Alquilada'), ('F', 'Familiar')]
PARENTESCO_CHOICES = [('padre', 'Padre'), ('madre', 'Madre'), ('esposo/a', 'Esposo(a)'), ('hermano/a', 'Hermano(a)'), ('hijo/a', 'Hijo(a)'), ('otro', 'Otro')]
NIVEL_ESTUDIO_CHOICES = [('primaria', 'Primaria'), ('secundaria', 'Secundaria'), ('tecnico', 'Técnico'), ('universitario', 'Universitario'), ('posgrado', 'Posgrado'), ('curso', 'Curso'), ('otro', 'Otro')]
ESTADO_ESTUDIO_CHOICES = [('concluido', 'Concluido'), ('cursando', 'Cursando'), ('inconcluso', 'Inconcluso')]
TIPO_CONTRATO_CHOICES = [('plazo_fijo', 'Plazo Fijo'), ('indefinido', 'Indefinido'), ('eventual', 'Eventual'), ('temporal', 'Temporal')]
TIPO_TRABAJADOR_CHOICES = [('eventual', 'Eventual'), ('permanente', 'Permanente'), ('consultor', 'Consultor'), ('pasante', 'Pasante')]
CONTRATO_FISCAL_CHOICES = [('avicola', 'Avicola Rolon S.R.L'), ('ovoplus', 'Ovoplus S.R.L'), ('soya_cruz', 'Soya Cruz S.R.L'), ('opticargo', 'Opticargo S.R.L'), ('rau_rimski', 'RAU Rimski Cesar Ariel Rolon Rios'), ('rau_nashira', 'RAU Nashira Orellana Rolon'), ('rau_silvia', 'RAU Silvia Catusha Rolon Rios')]
JORNADA_LABORAL_CHOICES = [('tiempo_completo', 'Tiempo Completo'), ('medio_tiempo', 'Medio Tiempo'), ('turnos', 'Turnos')]
ESTADO_CONTRATO_CHOICES = [('vigente', 'Vigente'), ('finalizado', 'Finalizado'), ('anulado', 'Anulado')]

# --- Main Models ---

class Departamento(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    jefe_departamento = models.ForeignKey(
        'Empleado', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='departamentos_liderados'
    )
    def __str__(self): return self.nombre

class Cargo(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    def __str__(self): return self.nombre

class Empleado(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='empleado')
    # Personal Information
    nombres = models.CharField(max_length=100)
    apellido_paterno = models.CharField(max_length=100)
    apellido_materno = models.CharField(max_length=100, blank=True, null=True)
    ci = models.CharField(max_length=20, unique=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES)
    estado_civil = models.CharField(max_length=1, choices=ESTADO_CIVIL_CHOICES)
    celular = models.CharField(max_length=20)
    email = models.EmailField(unique=True)
    provincia = models.CharField(max_length=100)
    direccion = models.CharField(max_length=255)
    tipo_vivienda = models.CharField(max_length=1, choices=TIPO_VIVIENDA_CHOICES)
    nacionalidad = models.CharField(max_length=50)
    nombre_conyuge = models.CharField(max_length=200, blank=True, null=True)
    tiene_hijos = models.BooleanField(default=False)
    foto = models.ImageField(upload_to=employee_directory_path, blank=True, null=True)

    # HR Information
    fecha_ingreso_inicial = models.DateField()
    fecha_ingreso_vigente = models.DateField(null=True, blank=True, help_text="Fecha de ingreso del contrato vigente")
    feature_vacaciones = models.BooleanField(default=True)
    # vacaciones_guardadas removed in favor of separate model
    cargo = models.ForeignKey(Cargo, on_delete=models.SET_NULL, null=True, blank=True)
    departamento = models.ForeignKey(Departamento, on_delete=models.SET_NULL, null=True, blank=True) # Sector is Departamento
    jefe = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinados')
    
    # Documents
    fotocopia_ci = models.FileField(upload_to=employee_directory_path, blank=True, null=True)
    curriculum_vitae = models.FileField(upload_to=employee_directory_path, blank=True, null=True)
    certificado_antecedentes = models.FileField(upload_to=employee_directory_path, blank=True, null=True)
    fotocopia_luz_agua_gas = models.FileField(upload_to=employee_directory_path, blank=True, null=True)
    croquis_domicilio = models.FileField(upload_to=employee_directory_path, blank=True, null=True)
    fotocopia_licencia_conducir = models.FileField(upload_to=employee_directory_path, blank=True, null=True)

    def __str__(self):
        return f'{self.nombres} {self.apellido_paterno}'

class Familiar(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='familiares')
    nombre_completo = models.CharField(max_length=200)
    parentesco = models.CharField(max_length=20, choices=PARENTESCO_CHOICES)
    celular = models.CharField(max_length=20, blank=True, null=True)
    fecha_nacimiento = models.DateField(blank=True, null=True) # New field for children's birth date
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.nombre_completo} ({self.get_parentesco_display()}) - {self.empleado}'

class Estudio(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='estudios')
    nivel = models.CharField(max_length=20, choices=NIVEL_ESTUDIO_CHOICES)
    carrera = models.CharField(max_length=100)
    institucion = models.CharField(max_length=100)
    estado = models.CharField(max_length=20, choices=ESTADO_ESTUDIO_CHOICES)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.get_nivel_display()}: {self.carrera} - {self.empleado}'

class Contrato(models.Model):

    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='contratos')

    tipo_contrato = models.CharField(max_length=20, choices=TIPO_CONTRATO_CHOICES)

    tipo_trabajador = models.CharField(max_length=20, choices=TIPO_TRABAJADOR_CHOICES)

    contrato_fiscal = models.CharField(max_length=20, choices=CONTRATO_FISCAL_CHOICES)

    fecha_inicio = models.DateField()

    fecha_fin = models.DateField(blank=True, null=True)

    fecha_fin_pactada = models.DateField(blank=True, null=True)

    salario_base = models.DecimalField(max_digits=10, decimal_places=2)

    jornada_laboral = models.CharField(max_length=20, choices=JORNADA_LABORAL_CHOICES)

    estado_contrato = models.CharField(max_length=20, choices=ESTADO_CONTRATO_CHOICES, default='vigente')

    observaciones = models.TextField(blank=True, null=True)



    def __str__(self):

        return f'Contrato {self.get_tipo_contrato_display()} para {self.empleado} ({self.fecha_inicio})'

# --- Choices for Permiso ---
TIPO_PERMISO_CHOICES = [
    ('trabajo', 'Trabajo'),
    ('personal', 'Personal'),
    ('hora_almuerzo', 'Hora Almuerzo'),
]

ESTADO_PERMISO_CHOICES = [
    ('pendiente', 'Pendiente'),
    ('aprobado', 'Aprobado'),
    ('anulado', 'Anulado'),
]

# --- Permiso Model ---

class Permiso(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='permisos')
    aprobador_asignado = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, blank=True, related_name='permisos_a_aprobar')
    fecha_solicitud = models.DateField()
    tipo_permiso = models.CharField(max_length=20, choices=TIPO_PERMISO_CHOICES)
    observacion = models.TextField(blank=True, null=True)
    hora_salida = models.TimeField()
    hora_regreso = models.TimeField()
    estado = models.CharField(max_length=20, choices=ESTADO_PERMISO_CHOICES, default='pendiente')
    comentario_aprobador = models.TextField(blank=True, null=True)
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'Permiso para {self.empleado} - {self.fecha_solicitud}'

# --- Choices for Hora Extra ---
TIPO_HORA_EXTRA_CHOICES = [
    ('compensacion', 'Compensación de Hrs Extra'),
    ('horas_extras', 'Horas Extras'),
]

# --- Hora Extra Model ---

class HoraExtra(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='horas_extras')
    aprobador_asignado = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, blank=True, related_name='horas_extras_a_aprobar')
    fecha_solicitud = models.DateField()
    tipo_hora_extra = models.CharField(max_length=20, choices=TIPO_HORA_EXTRA_CHOICES)
    observacion = models.TextField(blank=True, null=True)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    estado = models.CharField(max_length=20, choices=ESTADO_PERMISO_CHOICES, default='pendiente')
    comentario_aprobador = models.TextField(blank=True, null=True)
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'Hora Extra {self.get_tipo_hora_extra_display()} para {self.empleado} - {self.fecha_solicitud}'

# --- Vacaciones Models ---

class VacacionPeriodo(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='periodos_vacacion')
    fecha_inicio = models.DateField(help_text="Fecha de inicio del contrato o ciclo")
    fecha_fin = models.DateField(null=True, blank=True, help_text="Fecha fin del contrato o renovación")
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"Periodo {self.fecha_inicio} - {self.empleado}"

class SolicitudVacacion(models.Model):
    ESTADO_CHOICES = [
        ('aprobado', 'Aprobado'),
        ('anulado', 'Anulado'), 
    ]
    
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='solicitudes_vacacion')
    aprobador = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, blank=True, related_name='vacaciones_a_aprobar')
    contrato = models.ForeignKey('Contrato', on_delete=models.SET_NULL, null=True, blank=True, related_name='solicitudes_vacacion')
    fecha_solicitud = models.DateField(auto_now_add=True)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    es_medio_dia = models.BooleanField(default=False, help_text="Si es True, cuenta como 0.5 días")
    dias_calculados = models.DecimalField(max_digits=5, decimal_places=1, help_text="Días a descontar del saldo")
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='aprobado')
    observacion = models.TextField(blank=True, null=True)
    comentario_aprobador = models.TextField(blank=True, null=True)
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Vacación {self.dias_calculados} días - {self.empleado}"

class VacacionMovimiento(models.Model):
    TIPO_CHOICES = [
        ('inicio_contrato', 'Inicio/Renovación Contrato'),
        ('acumulacion_anual', 'Acumulación Anual'),
        ('consumo', 'Consumo (Solicitud)'),
        ('pago', 'Pago en Efectivo'),
        ('ajuste', 'Ajuste Manual'),
        ('traspaso', 'Traspaso de Saldo'),
    ]

    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='movimientos_vacacion')
    periodo = models.ForeignKey('VacacionPeriodo', on_delete=models.CASCADE, related_name='movimientos')
    contrato = models.ForeignKey('Contrato', on_delete=models.SET_NULL, null=True, blank=True, related_name='movimientos_vacacion')
    fecha = models.DateField(auto_now_add=True)
    tipo = models.CharField(max_length=50, choices=TIPO_CHOICES)
    dias = models.DecimalField(max_digits=6, decimal_places=2, help_text="Valor positivo aumenta saldo, negativo resta")
    solicitud = models.ForeignKey(SolicitudVacacion, on_delete=models.SET_NULL, null=True, blank=True, related_name='movimientos')
    detalle = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.tipo} ({self.dias}) - {self.empleado}"

class VacacionGuardada(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='vacaciones_guardadas_list')
    contrato = models.ForeignKey('Contrato', on_delete=models.SET_NULL, null=True, blank=True, related_name='vacaciones_guardadas')
    dias = models.DecimalField(max_digits=5, decimal_places=1)
    gestion = models.CharField(max_length=50, blank=True, null=True, help_text="Gestión o motivo (ej. 2022-2023)")
    fecha_creacion = models.DateField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.empleado} - {self.dias} días ({self.gestion})"
