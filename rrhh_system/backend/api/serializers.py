from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.models import User, Group
from .models import (
    Empleado, Departamento, Cargo, Familiar, Estudio, Contrato
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

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'groups', 'is_superuser')

class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for user creation.
    """
    email = serializers.EmailField(required=True)
    # The role is now optional and defaults to 'Empleado' if not provided.
    role = serializers.ChoiceField(choices=['Admin', 'RRHH', 'Encargado', 'Empleado'], write_only=True, required=False)
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
        fields = ['id', 'nombre_completo', 'parentesco', 'celular', 'activo']

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
        fields = ['id', 'nombres', 'apellido_paterno']

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
            'id', 'nombres', 'apellido_paterno', 'apellido_materno', 'ci',
            'fecha_nacimiento', 'sexo', 'estado_civil', 'celular', 'email',
            'provincia', 'direccion', 'tipo_vivienda', 'nacionalidad',
            'nombre_conyuge', 'tiene_hijos', 'fecha_ingreso_inicial',
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
        familiares_data = validated_data.pop('familiares', [])
        estudios_data = validated_data.pop('estudios', [])
        contratos_data = validated_data.pop('contratos', [])

        empleado = Empleado.objects.create(**validated_data)

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

        # Update the Empleado instance
        instance = super().update(instance, validated_data)

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
        
        instance.save()
        return instance

# Simple serializers for the dropdowns
class DepartamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departamento
        fields = ['id', 'nombre']

class CargoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cargo
        fields = ['id', 'nombre']