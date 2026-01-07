from rest_framework import viewsets, generics
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User
from .models import (
    Empleado, Departamento, Cargo, Familiar, Estudio, Contrato
)
from .serializers import (
    EmpleadoSerializer, DepartamentoSerializer, CargoSerializer,
    FamiliarSerializer, EstudioSerializer, ContratoSerializer, UserSerializer
)

class UserCreate(generics.CreateAPIView):
    """
    API endpoint for creating a new user.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class EmpleadoViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows employees to be viewed or edited.
    This viewset supports file uploads.
    """
    queryset = Empleado.objects.all().order_by('-fecha_ingreso_inicial')
    serializer_class = EmpleadoSerializer
    parser_classes = (MultiPartParser, FormParser)

class DepartamentoViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows departments to be viewed or edited.
    """
    queryset = Departamento.objects.all().order_by('nombre')
    serializer_class = DepartamentoSerializer

class CargoViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows positions (cargos) to be viewed or edited.
    """
    queryset = Cargo.objects.all().order_by('nombre')
    serializer_class = CargoSerializer

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