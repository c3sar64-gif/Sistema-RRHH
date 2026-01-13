from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.models import User, Group
from .models import (
    Empleado, Departamento, Cargo, Familiar, Estudio, Contrato, Permiso, HoraExtra,
    VacacionPeriodo, SolicitudVacacion, VacacionMovimiento, VacacionGuardada
)

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ('name',)

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying user details.
    """
    groups = GroupSerializer(many=True, read_only=True)
    empleado_id = serializers.SerializerMethodField()
    empleado_nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'groups', 'is_superuser', 'empleado_id', 'empleado_nombre')

    def get_empleado_id(self, obj):
        return obj.empleado.id if hasattr(obj, 'empleado') else None

    def get_empleado_nombre(self, obj):
        if hasattr(obj, 'empleado'):
            materno = f" {obj.empleado.apellido_materno}" if obj.empleado.apellido_materno else ""
            return f"{obj.empleado.nombres} {obj.empleado.apellido_paterno}{materno}"
        return None

class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for user creation.
    """
    email = serializers.EmailField(required=True)
    # The role is now optional and defaults to 'Empleado' if not provided.
    role = serializers.ChoiceField(choices=['Admin', 'RRHH', 'Encargado', 'Empleado', 'Jefe de Departamento', 'Porteria'], write_only=True, required=False)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'role')

    def create(self, validated_data):
        # Default to 'Empleado' if 'role' is not in the validated data
        role_name = validated_data.pop('role', 'Empleado')
        user = User.objects.create_user(**validated_data)
        
        try:
            group = Group.objects.get(name=role_name)
            user.groups.add(group)
        except Group.DoesNotExist:
            # Handle case where group doesn't exist. Maybe log it.
            # For now, we'll just not assign the group.
            pass
            
        return user

# First, define the serializers for the nested models.

class FamiliarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Familiar
        fields = ['id', 'nombre_completo', 'parentesco', 'celular', 'fecha_nacimiento', 'activo']

class EstudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estudio
        fields = ['id', 'nivel', 'carrera', 'institucion', 'estado', 'activo']

class ContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contrato
        fields = [
            'id', 'tipo_contrato', 'tipo_trabajador', 'contrato_fiscal', 
            'fecha_inicio', 'fecha_fin', 'fecha_fin_pactada', 'salario_base',
            'jornada_laboral', 'estado_contrato', 'observaciones'
        ]

# A simple serializer just for showing the name of the boss
class JefeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empleado
        fields = ['id', 'nombres', 'apellido_paterno', 'apellido_materno']

# Now, the main serializer for Empleado, which handles nested writes.

class EmpleadoSerializer(serializers.ModelSerializer):
    # Nested serializers for read operations
    familiares = FamiliarSerializer(many=True, required=False)
    estudios = EstudioSerializer(many=True, required=False)
    contratos = ContratoSerializer(many=True, required=False)
    
    # Read-only fields for related names
    departamento_nombre = serializers.CharField(source='departamento.nombre', read_only=True)
    cargo_nombre = serializers.CharField(source='cargo.nombre', read_only=True)
    jefe_info = JefeSerializer(source='jefe', read_only=True)

    # Explicitly define file fields to ensure they are not required
    fotocopia_ci = serializers.FileField(required=False, allow_null=True)
    curriculum_vitae = serializers.FileField(required=False, allow_null=True)
    certificado_antecedentes = serializers.FileField(required=False, allow_null=True)
    fotocopia_luz_agua_gas = serializers.FileField(required=False, allow_null=True)
    croquis_domicilio = serializers.FileField(required=False, allow_null=True)
    fotocopia_licencia_conducir = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Empleado
        fields = [
            'id', 'user', 'nombres', 'apellido_paterno', 'apellido_materno', 'ci',
            'fecha_nacimiento', 'sexo', 'estado_civil', 'celular', 'email',
            'provincia', 'direccion', 'tipo_vivienda', 'nacionalidad',
            'nombre_conyuge', 'tiene_hijos', 'fecha_ingreso_inicial', 'fecha_ingreso_vigente',
            'cargo', 'cargo_nombre',
            'departamento', 'departamento_nombre',
            'jefe', 'jefe_info', 'foto',
            'fotocopia_ci', 'curriculum_vitae', 'certificado_antecedentes',
            'fotocopia_luz_agua_gas', 'croquis_domicilio', 'fotocopia_licencia_conducir',
            'familiares', 'estudios', 'contratos'
        ]
        read_only_fields = ['departamento_nombre', 'cargo_nombre', 'jefe_info']
        # Also ensure related fields are optional on write
        extra_kwargs = {
            'departamento': {'required': False, 'allow_null': True},
            'cargo': {'required': False, 'allow_null': True},
            'jefe': {'required': False, 'allow_null': True},
        }

    @transaction.atomic
    def create(self, validated_data):
        # Pop nested data
        familiares_data = validated_data.pop('familiares', [])
        estudios_data = validated_data.pop('estudios', [])
        contratos_data = validated_data.pop('contratos', [])

        # Pop file fields to handle separately after Empleado instance gets an ID
        foto_file = validated_data.pop('foto', None)
        fotocopia_ci_file = validated_data.pop('fotocopia_ci', None)
        curriculum_vitae_file = validated_data.pop('curriculum_vitae', None)
        certificado_antecedentes_file = validated_data.pop('certificado_antecedentes', None)
        fotocopia_luz_agua_gas_file = validated_data.pop('fotocopia_luz_agua_gas', None)
        croquis_domicilio_file = validated_data.pop('croquis_domicilio', None)
        fotocopia_licencia_conducir_file = validated_data.pop('fotocopia_licencia_conducir', None)

        # Create Empleado instance first to ensure it has an ID
        empleado = Empleado.objects.create(**validated_data)

        # Assign and save file fields now that Empleado has an ID
        if foto_file:
            empleado.foto = foto_file
        if fotocopia_ci_file:
            empleado.fotocopia_ci = fotocopia_ci_file
        if curriculum_vitae_file:
            empleado.curriculum_vitae = curriculum_vitae_file
        if certificado_antecedentes_file:
            empleado.certificado_antecedentes = certificado_antecedentes_file
        if fotocopia_luz_agua_gas_file:
            empleado.fotocopia_luz_agua_gas = fotocopia_luz_agua_gas_file
        if croquis_domicilio_file:
            empleado.croquis_domicilio = croquis_domicilio_file
        if fotocopia_licencia_conducir_file:
            empleado.fotocopia_licencia_conducir = fotocopia_licencia_conducir_file
        
        # Save again if any file fields were assigned
        if any([foto_file, fotocopia_ci_file, curriculum_vitae_file, certificado_antecedentes_file, fotocopia_luz_agua_gas_file, croquis_domicilio_file, fotocopia_licencia_conducir_file]):
            empleado.save()

        for familiar_data in familiares_data:
            Familiar.objects.create(empleado=empleado, **familiar_data)
        
        for estudio_data in estudios_data:
            Estudio.objects.create(empleado=empleado, **estudio_data)

        for contrato_data in contratos_data:
            Contrato.objects.create(empleado=empleado, **contrato_data)

        return empleado

    @transaction.atomic
    def update(self, instance, validated_data):
        # Pop nested data to handle separately
        familiares_data = validated_data.pop('familiares', None)
        estudios_data = validated_data.pop('estudios', None)
        contratos_data = validated_data.pop('contratos', None)

        # Pop file fields to handle separately after primary instance update
        foto_file = validated_data.pop('foto', None)
        fotocopia_ci_file = validated_data.pop('fotocopia_ci', None)
        curriculum_vitae_file = validated_data.pop('curriculum_vitae', None)
        certificado_antecedentes_file = validated_data.pop('certificado_antecedentes', None)
        fotocopia_luz_agua_gas_file = validated_data.pop('fotocopia_luz_agua_gas', None)
        croquis_domicilio_file = validated_data.pop('croquis_domicilio', None)
        fotocopia_licencia_conducir_file = validated_data.pop('fotocopia_licencia_conducir', None)

        # Update the Empleado instance
        instance = super().update(instance, validated_data)

        # Assign and save file fields if they were provided in the update
        if foto_file:
            instance.foto = foto_file
        if fotocopia_ci_file:
            instance.fotocopia_ci = fotocopia_ci_file
        if curriculum_vitae_file:
            instance.curriculum_vitae = curriculum_vitae_file
        if certificado_antecedentes_file:
            instance.certificado_antecedentes = certificado_antecedentes_file
        if fotocopia_luz_agua_gas_file:
            instance.fotocopia_luz_agua_gas = fotocopia_luz_agua_gas_file
        if croquis_domicilio_file:
            instance.croquis_domicilio = croquis_domicilio_file
        if fotocopia_licencia_conducir_file:
            instance.fotocopia_licencia_conducir = fotocopia_licencia_conducir_file
        
        # Save again if any file fields were assigned/updated
        if any([foto_file, fotocopia_ci_file, curriculum_vitae_file, certificado_antecedentes_file, fotocopia_luz_agua_gas_file, croquis_domicilio_file, fotocopia_licencia_conducir_file]):
            instance.save() 

        # Handle nested updates. This is a simple implementation: delete old and create new.
        # A more complex implementation would update existing objects by ID.
        if familiares_data is not None:
            instance.familiares.all().delete()
            for familiar_data in familiares_data:
                Familiar.objects.create(empleado=instance, **familiar_data)

        if estudios_data is not None:
            instance.estudios.all().delete()
            for estudio_data in estudios_data:
                Estudio.objects.create(empleado=instance, **estudio_data)

        if contratos_data is not None:
            instance.contratos.all().delete()
            for contrato_data in contratos_data:
                Contrato.objects.create(empleado=instance, **contrato_data)
        
        # This instance.save() was already here, keep it for other non-file field updates
        instance.save() 
        return instance

# Simple serializers for the dropdowns
class DepartamentoSerializer(serializers.ModelSerializer):
    jefe_departamento_info = JefeSerializer(source='jefe_departamento', read_only=True)

    class Meta:
        model = Departamento
        fields = ['id', 'nombre', 'jefe_departamento', 'jefe_departamento_info']
        extra_kwargs = {
            'jefe_departamento': {'required': False, 'allow_null': True},
        }

class CargoSerializer(serializers.ModelSerializer):

    class Meta:

        model = Cargo

        fields = ['id', 'nombre']

class PermisoSerializer(serializers.ModelSerializer):
    empleado_info = JefeSerializer(source='empleado', read_only=True)
    aprobador_asignado_info = JefeSerializer(source='aprobador_asignado', read_only=True)
    departamento_nombre = serializers.CharField(source='empleado.departamento.nombre', read_only=True, allow_null=True)

    class Meta:
        model = Permiso
        fields = '__all__'
        read_only_fields = [
            'empleado_info',
            'aprobador_asignado',
            'aprobador_asignado_info',
            'departamento_nombre',
            'fecha_aprobacion',
            'comentario_aprobador',
        ]

class HoraExtraSerializer(serializers.ModelSerializer):
    empleado_info = JefeSerializer(source='empleado', read_only=True)
    aprobador_asignado_info = JefeSerializer(source='aprobador_asignado', read_only=True)
    departamento_nombre = serializers.CharField(source='empleado.departamento.nombre', read_only=True, allow_null=True)

    class Meta:
        model = HoraExtra
        fields = '__all__'
        read_only_fields = [
            'empleado_info',
            'aprobador_asignado',
            'aprobador_asignado_info',
            'departamento_nombre',
            'fecha_aprobacion',
            'comentario_aprobador',
        ]

class VacacionPeriodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = VacacionPeriodo
        fields = '__all__'

class VacacionMovimientoSerializer(serializers.ModelSerializer):
    solicitud_detalle = serializers.SerializerMethodField()
    
    class Meta:
        model = VacacionMovimiento
        fields = '__all__'
    
    def get_solicitud_detalle(self, obj):
        if obj.solicitud:
            return f"{obj.solicitud.fecha_inicio} a {obj.solicitud.fecha_fin}"
        return None

class SolicitudVacacionSerializer(serializers.ModelSerializer):
    empleado_info = JefeSerializer(source='empleado', read_only=True)
    aprobador_info = JefeSerializer(source='aprobador', read_only=True)
    departamento_nombre = serializers.CharField(source='empleado.departamento.nombre', read_only=True, allow_null=True)
    contrato_nombre = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudVacacion
        fields = '__all__'
        read_only_fields = ['dias_calculados', 'fecha_solicitud', 'estado', 'fecha_aprobacion', 'comentario_aprobador', 'empleado_info', 'aprobador_info', 'departamento_nombre', 'contrato_nombre']
    
    def get_contrato_nombre(self, obj):
        if obj.contrato:
            return f"Contrato {obj.contrato.fecha_inicio} al {obj.contrato.fecha_fin or 'Presente'}"
        return None

class VacacionGuardadaSerializer(serializers.ModelSerializer):
    empleado_nombre = serializers.SerializerMethodField()
    departamento_nombre = serializers.CharField(source='empleado.departamento.nombre', read_only=True)
    contrato_nombre = serializers.SerializerMethodField()

    class Meta:
        model = VacacionGuardada
        fields = '__all__'
    
    def get_empleado_nombre(self, obj):
        return f"{obj.empleado.nombres} {obj.empleado.apellido_paterno} {obj.empleado.apellido_materno or ''}".strip()

    def get_contrato_nombre(self, obj):
        if obj.contrato:
            return f"Contrato {obj.contrato.fecha_inicio}"
        return None
