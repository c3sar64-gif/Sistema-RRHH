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
    """
    API endpoint that allows users to be viewed, edited, or deleted.
    Accessible only by Admin users.
    """
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
    """
    API endpoint for creating a new user.
    Accessible only by Admin users.
    """
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [IsAdminUser]

class JefesDepartamentoListView(generics.ListAPIView):
    """
    API endpoint that provides a list of employees who are heads of a department.
    """
    queryset = Empleado.objects.filter(departamentos_liderados__isnull=False).distinct().order_by('nombres', 'apellido_paterno', 'apellido_materno')
    serializer_class = JefeSerializer
    permission_classes = [IsAdminUser]
    pagination_class = None

class EmpleadoViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows employees to be viewed or edited.
    """
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
    """
    API endpoint that allows departments to be viewed or edited.
    """
    queryset = Departamento.objects.all().order_by('nombre')
    serializer_class = DepartamentoSerializer
    permission_classes = [IsAdminUser]
    pagination_class = OptionalPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

class CargoViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows positions (cargos) to be viewed or edited.
    """
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
    """
    API endpoint for managing hourly permissions.
    """
    queryset = Permiso.objects.all().order_by('-fecha_solicitud')
    serializer_class = PermisoSerializer
    permission_classes = [IsAuthenticated]

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    A view to get the details of the currently authenticated user.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)