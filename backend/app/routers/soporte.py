from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario, Rol, SoporteTicket, SoporteMensaje, Notificacion
from app.schemas import (
    CrearTicketSoporte,
    CrearMensajeSoporte,
    CambiarEstadoTicket,
    SoportePublicoCrear,
)

router = APIRouter()


def verificar_usuario_activo(db: Session, id_usuario: int):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if usuario.estado != "ACTIVO":
        raise HTTPException(status_code=403, detail="El usuario no está activo")

    return usuario


def verificar_admin(db: Session, id_admin: int):
    usuario = verificar_usuario_activo(db, id_admin)
    rol = db.query(Rol).filter(Rol.id_rol == usuario.id_rol).first()
    nombre_rol = rol.nombre_rol.upper() if rol else ""

    if nombre_rol not in ["ADMIN", "ADMINISTRADOR"]:
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")

    return usuario


def es_usuario_admin(db: Session, usuario: Usuario):
    rol = db.query(Rol).filter(Rol.id_rol == usuario.id_rol).first()
    nombre_rol = rol.nombre_rol.upper() if rol else ""
    return nombre_rol in ["ADMIN", "ADMINISTRADOR"]


def datos_autor(db: Session, id_usuario: int):
    autor = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not autor:
        return {
            "id_usuario": id_usuario,
            "nombre": "Usuario",
            "apellido": None,
            "email": None,
            "rol": "USUARIO"
        }

    rol = db.query(Rol).filter(Rol.id_rol == autor.id_rol).first()

    return {
        "id_usuario": autor.id_usuario,
        "nombre": autor.nombre,
        "apellido": autor.apellido,
        "email": autor.email,
        "rol": rol.nombre_rol if rol else "USUARIO"
    }




def obtener_admins_activos(db: Session):
    return (
        db.query(Usuario)
        .join(Rol, Usuario.id_rol == Rol.id_rol)
        .filter(
            Rol.nombre_rol.in_(["ADMIN", "ADMINISTRADOR", "Administrador"]),
            Usuario.estado == "ACTIVO"
        )
        .all()
    )

def obtener_usuario_sistema_soporte(db: Session):
    usuario_admin = (
        db.query(Usuario)
        .join(Rol, Usuario.id_rol == Rol.id_rol)
        .filter(
            Rol.nombre_rol.in_(["ADMIN", "ADMINISTRADOR", "Administrador"]),
            Usuario.estado == "ACTIVO"
        )
        .order_by(Usuario.id_usuario.asc())
        .first()
    )

    if usuario_admin:
        return usuario_admin

    usuario = db.query(Usuario).order_by(Usuario.id_usuario.asc()).first()

    if not usuario:
        raise HTTPException(status_code=500, detail="No existe un usuario del sistema para registrar soporte")

    return usuario


@router.post("/soporte/publico")
def crear_ticket_soporte_publico(
    datos: SoportePublicoCrear,
    db: Session = Depends(get_db)
):
    # Se conserva para compatibilidad, pero ya no se muestra en el login.
    usuario_sistema = obtener_usuario_sistema_soporte(db)

    asunto_limpio = datos.asunto.strip()
    descripcion = (
        "Solicitud enviada desde soporte público de Zyra.\n"
        f"Nombre: {datos.nombre.strip()}\n"
        f"Correo: {datos.email.strip()}\n"
        f"Tipo de usuario: {(datos.tipo_usuario or 'Visitante').strip()}\n\n"
        "Mensaje:\n"
        f"{datos.mensaje.strip()}"
    )

    nuevo_ticket = SoporteTicket(
        id_usuario=usuario_sistema.id_usuario,
        asunto=f"[PÚBLICO] {asunto_limpio}",
        descripcion=descripcion,
        estado_ticket="ABIERTO"
    )

    db.add(nuevo_ticket)
    db.flush()

    db.add(SoporteMensaje(
        id_ticket=nuevo_ticket.id_ticket,
        id_usuario=usuario_sistema.id_usuario,
        mensaje=descripcion
    ))

    db.commit()
    db.refresh(nuevo_ticket)

    return {
        "mensaje": "Mensaje enviado a soporte técnico correctamente",
        "id_ticket": nuevo_ticket.id_ticket,
        "estado_ticket": nuevo_ticket.estado_ticket
    }


@router.post("/soporte/tickets")
def crear_ticket_soporte(
    datos: CrearTicketSoporte,
    db: Session = Depends(get_db)
):
    usuario = verificar_usuario_activo(db, datos.id_usuario)

    asunto = datos.asunto.strip()
    descripcion = datos.descripcion.strip()

    if not asunto:
        raise HTTPException(status_code=400, detail="Debes escribir un asunto")

    if not descripcion:
        raise HTTPException(status_code=400, detail="Debes escribir el mensaje de soporte")

    nuevo_ticket = SoporteTicket(
        id_usuario=datos.id_usuario,
        asunto=asunto,
        descripcion=descripcion,
        estado_ticket="ABIERTO"
    )

    db.add(nuevo_ticket)
    db.flush()

    primer_mensaje = SoporteMensaje(
        id_ticket=nuevo_ticket.id_ticket,
        id_usuario=datos.id_usuario,
        mensaje=descripcion
    )

    db.add(primer_mensaje)
    db.commit()
    db.refresh(nuevo_ticket)

    return {
        "mensaje": "Ticket de soporte creado correctamente",
        "id_ticket": nuevo_ticket.id_ticket,
        "id_usuario": usuario.id_usuario,
        "asunto": nuevo_ticket.asunto,
        "estado_ticket": nuevo_ticket.estado_ticket
    }


@router.get("/usuario/{id_usuario}/soporte/tickets")
def listar_tickets_usuario(
    id_usuario: int,
    db: Session = Depends(get_db)
):
    verificar_usuario_activo(db, id_usuario)

    tickets = db.query(SoporteTicket).filter(
        SoporteTicket.id_usuario == id_usuario
    ).order_by(SoporteTicket.id_ticket.desc()).all()

    resultado = []

    for ticket in tickets:
        mensajes = db.query(SoporteMensaje).filter(
            SoporteMensaje.id_ticket == ticket.id_ticket
        ).order_by(SoporteMensaje.id_mensaje.asc()).all()

        ultimo_mensaje = mensajes[-1] if mensajes else None
        ultimo_autor = datos_autor(db, ultimo_mensaje.id_usuario) if ultimo_mensaje else None

        resultado.append({
            "id_ticket": ticket.id_ticket,
            "asunto": ticket.asunto,
            "descripcion": ticket.descripcion,
            "estado_ticket": ticket.estado_ticket,
            "total_mensajes": len(mensajes),
            "ultimo_mensaje": ultimo_mensaje.mensaje if ultimo_mensaje else ticket.descripcion,
            "ultimo_autor": ultimo_autor,
        })

    return {
        "mensaje": "Tickets del usuario",
        "id_usuario": id_usuario,
        "total": len(resultado),
        "tickets": resultado
    }


@router.get("/soporte/tickets/{id_ticket}/mensajes")
def ver_mensajes_ticket(
    id_ticket: int,
    id_usuario: int,
    db: Session = Depends(get_db)
):
    usuario = verificar_usuario_activo(db, id_usuario)
    ticket = db.query(SoporteTicket).filter(SoporteTicket.id_ticket == id_ticket).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    es_admin = es_usuario_admin(db, usuario)

    if ticket.id_usuario != id_usuario and not es_admin:
        raise HTTPException(status_code=403, detail="No puedes ver este ticket")

    mensajes = db.query(SoporteMensaje).filter(
        SoporteMensaje.id_ticket == id_ticket
    ).order_by(SoporteMensaje.id_mensaje.asc()).all()

    resultado = []

    for mensaje in mensajes:
        autor = datos_autor(db, mensaje.id_usuario)
        resultado.append({
            "id_mensaje": mensaje.id_mensaje,
            "id_usuario": mensaje.id_usuario,
            "nombre": autor["nombre"],
            "apellido": autor["apellido"],
            "email": autor["email"],
            "rol": autor["rol"],
            "mensaje": mensaje.mensaje
        })

    return {
        "mensaje": "Mensajes del ticket",
        "id_ticket": ticket.id_ticket,
        "asunto": ticket.asunto,
        "descripcion": ticket.descripcion,
        "estado_ticket": ticket.estado_ticket,
        "usuario_ticket": datos_autor(db, ticket.id_usuario),
        "mensajes": resultado
    }


@router.post("/soporte/tickets/{id_ticket}/mensajes")
def responder_ticket_soporte(
    id_ticket: int,
    datos: CrearMensajeSoporte,
    db: Session = Depends(get_db)
):
    usuario = verificar_usuario_activo(db, datos.id_usuario)
    ticket = db.query(SoporteTicket).filter(SoporteTicket.id_ticket == id_ticket).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    es_admin = es_usuario_admin(db, usuario)

    if ticket.id_usuario != datos.id_usuario and not es_admin:
        raise HTTPException(status_code=403, detail="No puedes responder este ticket")

    mensaje_limpio = datos.mensaje.strip()

    if not mensaje_limpio:
        raise HTTPException(status_code=400, detail="Debes escribir una respuesta")

    nuevo_mensaje = SoporteMensaje(
        id_ticket=id_ticket,
        id_usuario=datos.id_usuario,
        mensaje=mensaje_limpio
    )

    db.add(nuevo_mensaje)

    if es_admin:
        ticket.estado_ticket = "EN_PROCESO" if ticket.estado_ticket == "ABIERTO" else ticket.estado_ticket
        db.add(Notificacion(
            id_usuario=ticket.id_usuario,
            titulo="Zyra respondió tu soporte",
            mensaje=f"El equipo de Zyra respondió tu ticket: {ticket.asunto}",
            leido=False
        ))
    else:
        if ticket.estado_ticket in ["CERRADO", "EN_PROCESO"]:
            ticket.estado_ticket = "ABIERTO"

        for admin in obtener_admins_activos(db):
            db.add(Notificacion(
                id_usuario=admin.id_usuario,
                titulo="Nueva respuesta de soporte",
                mensaje=f"{usuario.nombre} respondió el ticket #{ticket.id_ticket}: {ticket.asunto}",
                leido=False
            ))

    db.commit()
    db.refresh(nuevo_mensaje)

    return {
        "mensaje": "Mensaje agregado al ticket correctamente",
        "id_ticket": id_ticket,
        "id_mensaje": nuevo_mensaje.id_mensaje
    }


@router.get("/admin/soporte/tickets")
def listar_tickets_admin(
    id_admin: int,
    db: Session = Depends(get_db)
):
    verificar_admin(db, id_admin)

    tickets = db.query(SoporteTicket).order_by(SoporteTicket.id_ticket.desc()).all()
    resultado = []

    for ticket in tickets:
        usuario = db.query(Usuario).filter(Usuario.id_usuario == ticket.id_usuario).first()
        rol = db.query(Rol).filter(Rol.id_rol == usuario.id_rol).first() if usuario else None
        mensajes = db.query(SoporteMensaje).filter(
            SoporteMensaje.id_ticket == ticket.id_ticket
        ).order_by(SoporteMensaje.id_mensaje.asc()).all()
        ultimo_mensaje = mensajes[-1] if mensajes else None

        resultado.append({
            "id_ticket": ticket.id_ticket,
            "asunto": ticket.asunto,
            "descripcion": ticket.descripcion,
            "estado_ticket": ticket.estado_ticket,
            "total_mensajes": len(mensajes),
            "ultimo_mensaje": ultimo_mensaje.mensaje if ultimo_mensaje else ticket.descripcion,
            "usuario": {
                "id_usuario": usuario.id_usuario if usuario else None,
                "nombre": usuario.nombre if usuario else None,
                "apellido": usuario.apellido if usuario else None,
                "email": usuario.email if usuario else None,
                "rol": rol.nombre_rol if rol else None
            } if usuario else None
        })

    return {
        "mensaje": "Tickets de soporte registrados",
        "total": len(resultado),
        "tickets": resultado
    }


@router.put("/admin/soporte/tickets/{id_ticket}/estado")
def cambiar_estado_ticket_admin(
    id_ticket: int,
    datos: CambiarEstadoTicket,
    db: Session = Depends(get_db)
):
    verificar_admin(db, datos.id_admin)

    ticket = db.query(SoporteTicket).filter(SoporteTicket.id_ticket == id_ticket).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    estados_permitidos = ["ABIERTO", "EN_PROCESO", "CERRADO"]

    if datos.estado_ticket not in estados_permitidos:
        raise HTTPException(status_code=400, detail="Estado no válido. Usa: ABIERTO, EN_PROCESO o CERRADO")

    ticket.estado_ticket = datos.estado_ticket

    db.add(Notificacion(
        id_usuario=ticket.id_usuario,
        titulo="Estado de soporte actualizado",
        mensaje=f"Tu ticket '{ticket.asunto}' ahora está en estado: {ticket.estado_ticket}",
        leido=False
    ))

    db.commit()
    db.refresh(ticket)

    return {
        "mensaje": "Estado del ticket actualizado correctamente",
        "id_ticket": ticket.id_ticket,
        "nuevo_estado": ticket.estado_ticket
    }


@router.get("/usuario/{id_usuario}/notificaciones")
def listar_notificaciones_usuario(
    id_usuario: int,
    db: Session = Depends(get_db)
):
    verificar_usuario_activo(db, id_usuario)

    notificaciones = db.query(Notificacion).filter(
        Notificacion.id_usuario == id_usuario
    ).order_by(Notificacion.id_notificacion.desc()).all()

    resultado = []

    for notificacion in notificaciones:
        resultado.append({
            "id_notificacion": notificacion.id_notificacion,
            "titulo": notificacion.titulo,
            "mensaje": notificacion.mensaje,
            "leido": notificacion.leido
        })

    return {
        "mensaje": "Notificaciones del usuario",
        "id_usuario": id_usuario,
        "total": len(resultado),
        "notificaciones": resultado
    }


@router.put("/usuario/notificaciones/{id_notificacion}/leer")
def marcar_notificacion_leida(
    id_notificacion: int,
    id_usuario: int,
    db: Session = Depends(get_db)
):
    verificar_usuario_activo(db, id_usuario)

    notificacion = db.query(Notificacion).filter(
        Notificacion.id_notificacion == id_notificacion,
        Notificacion.id_usuario == id_usuario
    ).first()

    if not notificacion:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    notificacion.leido = True

    db.commit()
    db.refresh(notificacion)

    return {
        "mensaje": "Notificación marcada como leída",
        "id_notificacion": notificacion.id_notificacion,
        "leido": notificacion.leido
    }
