# api/permissions.py
from rest_framework.permissions import BasePermission

class IsAdminUser(BasePermission):
    """
    Allows access only to admin users or superusers or RRHH.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        return request.user.is_superuser or request.user.groups.filter(name__in=['Admin', 'RRHH']).exists()

class IsStaffUser(BasePermission):
    """
    Allows access to Admin, RRHH, Encargado, and Jefe de Departamento.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        return request.user.is_superuser or request.user.groups.filter(name__in=['Admin', 'RRHH', 'Encargado', 'Jefe de Departamento', 'Porteria']).exists()

class IsStaffReadOnly(BasePermission):
    """
    Allocates Read-Only access to Staff (including Porteria) and Write access only to Admin/RRHH.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        is_staff = request.user.is_superuser or request.user.groups.filter(name__in=['Admin', 'RRHH', 'Encargado', 'Jefe de Departamento', 'Porteria']).exists()
        is_admin_hr = request.user.is_superuser or request.user.groups.filter(name__in=['Admin', 'RRHH']).exists()
        
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return is_staff
        return is_admin_hr
