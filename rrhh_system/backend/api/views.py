from rest_framework import viewsets, generics, status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User, Group
from django.db import transaction
from .models import (
    Empleado, Departamento, Cargo, Familiar, Estudio, Contrato
)
from .serializers import (
    EmpleadoSerializer, DepartamentoSerializer, CargoSerializer,
    FamiliarSerializer, EstudioSerializer, ContratoSerializer, UserSerializer, UserCreateSerializer
)
from .permissions import IsAdminUser

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed, edited, or deleted.
    Accessible only by Admin users.
    """
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    def partial_update(self, request, *args, **kwargs):
        """
        Custom update to handle changing a user's group (role).
        """
        instance = self.get_object()
        role_name = request.data.get('role')

        if not role_name:
            return Response({"error": "El campo 'role' es requerido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_group = Group.objects.get(name=role_name)
        except Group.DoesNotExist:
            return Response({"error": f"El grupo '{role_name}' no existe."}, status=status.HTTP_400_BAD_REQUEST)

        # Usar una transacción para asegurar la integridad de los datos
        with transaction.atomic():
            instance.groups.clear()
            instance.groups.add(new_group)
        
        # Devolver el objeto de usuario actualizado
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

from rest_framework import viewsets, generics, status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User, Group
from django.db import transaction
import json
from .models import (
    Empleado, Departamento, Cargo, Familiar, Estudio, Contrato
)
from .serializers import (
    EmpleadoSerializer, DepartamentoSerializer, CargoSerializer,
    FamiliarSerializer, EstudioSerializer, ContratoSerializer, UserSerializer, UserCreateSerializer
)
from .permissions import IsAdminUser
from rest_framework import filters
from .pagination import OptionalPagination

class EmpleadoViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows employees to be viewed or edited.
    This viewset supports file uploads.
    """
    queryset = Empleado.objects.all().order_by('nombres', 'apellido_paterno', 'apellido_materno')
    serializer_class = EmpleadoSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAdminUser]
    pagination_class = OptionalPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombres', 'apellido_paterno', 'apellido_materno', 'ci']

    def _prepare_data_from_request(self, request):
        """
        Helper to construct a single data dictionary from request.POST, request.FILES,
        and our custom JSON-string fields.
        """
        data = {}
        # Copy all POST data into our new dict
        for key, value in request.POST.items():
            data[key] = value

        # Parse JSON strings into nested data structures
        if 'familiares_json' in data:
            data['familiares'] = json.loads(data.pop('familiares_json'))
        if 'contratos_json' in data:
            data['contratos'] = json.loads(data.pop('contratos_json'))
        if 'estudios_json' in data:
            data['estudios'] = json.loads(data.pop('estudios_json'))

        # Add file objects to the data
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

# Viewsets for the new related models
# These can be used for managing related objects independently if needed in the future.

class FamiliarViewSet(viewsets.ModelViewSet):
    """
    API endpoint for employee's family members.
    """
    queryset = Familiar.objects.all()
    serializer_class = FamiliarSerializer

class EstudioViewSet(viewsets.ModelViewSet):
    """
    API endpoint for employee's education history.
    """
    queryset = Estudio.objects.all()
    serializer_class = EstudioSerializer

class ContratoViewSet(viewsets.ModelViewSet):
    """
    API endpoint for employee's contracts.
    """
    queryset = Contrato.objects.all()
    serializer_class = ContratoSerializer

# --- Current User View ---
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    A view to get the details of the currently authenticated user.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

