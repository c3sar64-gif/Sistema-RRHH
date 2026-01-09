from rest_framework import viewsets, generics, status, filters
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User, Group
from django.db import transaction, models
from django.utils import timezone
import json

from .models import (
    Empleado, Departamento, Cargo, Familiar, Estudio, Contrato, Permiso
)
from .serializers import (
    EmpleadoSerializer, DepartamentoSerializer, CargoSerializer,
    FamiliarSerializer, EstudioSerializer, ContratoSerializer, UserSerializer, UserCreateSerializer,
    JefeSerializer, PermisoSerializer
)
from .permissions import IsAdminUser
from .pagination import OptionalPagination

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        role_name = request.data.get('role')
        if not role_name:
            return Response({"error": "El campo 'role' es requerido."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            new_group = Group.objects.get(name=role_name)
        except Group.DoesNotExist:
            return Response({"error": f"El grupo '{role_name}' no existe."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            instance.groups.clear()
            instance.groups.add(new_group)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

class UserCreate(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [IsAdminUser]

class JefesDepartamentoListView(generics.ListAPIView):
    queryset = Empleado.objects.filter(departamentos_liderados__isnull=False).distinct().order_by('nombres', 'apellido_paterno', 'apellido_materno')
    serializer_class = JefeSerializer
    permission_classes = [IsAdminUser]
    pagination_class = None

class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all().order_by('nombres', 'apellido_paterno', 'apellido_materno')
    serializer_class = EmpleadoSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAdminUser]
    pagination_class = OptionalPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombres', 'apellido_paterno', 'apellido_materno', 'ci']

    def _prepare_data_from_request(self, request):
        data = request.POST.copy()
        if 'familiares_json' in data:
            data['familiares'] = json.loads(data.pop('familiares_json')[0])
        if 'contratos_json' in data:
            data['contratos'] = json.loads(data.pop('contratos_json')[0])
        if 'estudios_json' in data:
            data['estudios'] = json.loads(data.pop('estudios_json')[0])
        for key, file in request.FILES.items():
            data[key] = file
        return data

    def create(self, request, *args, **kwargs):
        data = self._prepare_data_from_request(request)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = self._prepare_data_from_request(request)
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

class DepartamentoViewSet(viewsets.ModelViewSet):
    queryset = Departamento.objects.all().order_by('nombre')
    serializer_class = DepartamentoSerializer
    permission_classes = [IsAdminUser]
    pagination_class = OptionalPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

class CargoViewSet(viewsets.ModelViewSet):
    queryset = Cargo.objects.all().order_by('nombre')
    serializer_class = CargoSerializer
    permission_classes = [IsAdminUser]
    pagination_class = OptionalPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

class FamiliarViewSet(viewsets.ModelViewSet):
    queryset = Familiar.objects.all()
    serializer_class = FamiliarSerializer
    permission_classes = [IsAdminUser]

class EstudioViewSet(viewsets.ModelViewSet):
    queryset = Estudio.objects.all()
    serializer_class = EstudioSerializer
    permission_classes = [IsAdminUser]

class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all()
    serializer_class = ContratoSerializer
    permission_classes = [IsAdminUser]

class PermisoViewSet(viewsets.ModelViewSet):
    queryset = Permiso.objects.all()
    serializer_class = PermisoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'empleado'):
            return Permiso.objects.none()

        empleado = user.empleado
        
        # Admin and RRHH groups can see all requests
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH']).exists():
            return Permiso.objects.all().order_by('-fecha_solicitud')
        
        queryset = Permiso.objects.none()

        # Encargado can see all requests from their department
        if user.groups.filter(name='Encargado').exists():
            if empleado.departamento:
                queryset = queryset.union(Permiso.objects.filter(empleado__departamento=empleado.departamento))

        # All non-admin/hr users (including Encargados) can see their own requests 
        # and requests they need to approve.
        queryset = queryset.union(Permiso.objects.filter(
            models.Q(empleado=empleado) | models.Q(aprobador_asignado=empleado)
        ))
        
        return queryset.distinct().order_by('-fecha_solicitud')

    def perform_create(self, serializer):
        user = self.request.user
        
        # Admin/HR can create for other employees specified in the request
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH', 'Encargado']).exists():
            empleado_id = self.request.data.get('empleado')
            if not empleado_id:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"empleado": "Debes seleccionar un empleado."})
            try:
                empleado = Empleado.objects.get(pk=empleado_id)
            except Empleado.DoesNotExist:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"empleado": "El empleado seleccionado no existe."})
        else: # Regular employee requests for themselves
            if not hasattr(user, 'empleado'):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("No tienes un perfil de empleado para crear solicitudes.")
            empleado = user.empleado

        aprobador = empleado.jefe
        if not aprobador:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(f"El empleado '{empleado}' no tiene un jefe inmediato asignado para aprobar el permiso.")
            
        serializer.save(empleado=empleado, aprobador_asignado=aprobador)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        solicitud = self.get_object()
        user_empleado = request.user.empleado
        if solicitud.aprobador_asignado != user_empleado:
            return Response({'error': 'No tienes permiso para aprobar esta solicitud.'}, status=status.HTTP_403_FORBIDDEN)
        if solicitud.estado != 'pendiente':
            return Response({'error': 'Solo se pueden aprobar solicitudes pendientes.'}, status=status.HTTP_400_BAD_REQUEST)
        solicitud.estado = 'aprobado'
        solicitud.fecha_aprobacion = timezone.now()
        solicitud.comentario_aprobador = request.data.get('comentario', 'Aprobado')
        solicitud.save()
        return Response(self.get_serializer(solicitud).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        solicitud = self.get_object()
        user_empleado = request.user.empleado
        if solicitud.aprobador_asignado != user_empleado:
            return Response({'error': 'No tienes permiso para rechazar esta solicitud.'}, status=status.HTTP_403_FORBIDDEN)
        if solicitud.estado != 'pendiente':
            return Response({'error': 'Solo se pueden rechazar solicitudes pendientes.'}, status=status.HTTP_400_BAD_REQUEST)
        solicitud.estado = 'rechazado'
        solicitud.fecha_aprobacion = timezone.now()
        solicitud.comentario_aprobador = request.data.get('comentario', 'Rechazado')
        solicitud.save()
        return Response(self.get_serializer(solicitud).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
