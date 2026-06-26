import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from database import obter_conexao
from auth import PermissaoRequerida
import schemas

router = APIRouter(prefix="/api/gestor", tags=["Gestão Administrativa"])