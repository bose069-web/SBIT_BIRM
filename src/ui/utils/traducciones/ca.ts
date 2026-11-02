/**
 * Traducciones al catalán. La clave es el texto exacto en castellano que se pasa a `t()`; las
 * marcas entre llaves (`{nombre}`) tienen que aparecer igual en la traducción.
 *
 * Por pantallas, para que cada PR añada su parte sin pisar las demás.
 */
export const CATALAN: Record<string, string> = {
  // Navegación
  Inicio: 'Inici',
  Calendario: 'Calendari',
  Seguimiento: 'Seguiment',
  Validaciones: 'Validacions',
  Chat: 'Xat',
  Perfil: 'Perfil',
  'Registrar hoy': 'Registrar avui',
  ', {n} sin leer': ', {n} sense llegir',
  'Kampus, ir a Inicio': "Kampus, anar a l'Inici",
  'Cambiar a modo claro': 'Canviar a mode clar',
  'Cambiar a modo oscuro': 'Canviar a mode fosc',
  Volver: 'Tornar',
  Sesión: 'Sessió',

  // Roles
  Alumno: 'Alumne',
  Empresa: 'Empresa',
  Profe: 'Profe',
  Instituto: 'Institut',
  Generalitat: 'Generalitat',
  'Tutor de empresa': "Tutor d'empresa",
  'Tutor del centro': 'Tutor del centre',

  // Entrada
  'Seguimiento de las prácticas FCT y Dual': 'Seguiment de les pràctiques FCT i Dual',
  Idioma: 'Idioma',
  Correo: 'Correu',
  'nombre@centro.cat': 'nom@centre.cat',
  Contraseña: 'Contrasenya',
  Entrar: 'Entrar',
  '¿Has olvidado tu contraseña?': 'Has oblidat la contrasenya?',
  'Volver a iniciar sesión': 'Tornar a iniciar sessió',
  'Pedir recuperación': 'Demanar recuperació',
  'Solicitud enviada. Si eres alumno, tu profe te pasará un enlace; si no, lo recibirás por correo.':
    'Sol·licitud enviada. Si ets alumne, el teu profe et passarà un enllaç; si no, el rebràs per correu.',
  'Cuentas de prueba (contraseña kampus)': 'Comptes de prova (contrasenya kampus)',
  'No se ha podido iniciar sesión': "No s'ha pogut iniciar sessió",
  'No se ha podido enviar la solicitud': "No s'ha pogut enviar la sol·licitud",
  'No se ha podido enviar la solicitud. Inténtalo de nuevo.':
    "No s'ha pogut enviar la sol·licitud. Torna-ho a provar.",
  'Email o contraseña incorrectos': 'Correu o contrasenya incorrectes',
  'Tu cuenta aún no está confirmada. Revisa tu correo o avisa a tu centro.':
    'El teu compte encara no està confirmat. Revisa el correu o avisa el teu centre.',
  'No se pudo cargar tu perfil. Inténtalo de nuevo.':
    "No s'ha pogut carregar el teu perfil. Torna-ho a provar.",
  'Tu cuenta todavía no tiene un perfil válido.': 'El teu compte encara no té un perfil vàlid.',
  'No se pudo recuperar la sesión. Comprueba la conexión y vuelve a intentarlo.':
    "No s'ha pogut recuperar la sessió. Comprova la connexió i torna-ho a provar.",
  'Escribe un correo válido': 'Escriu un correu vàlid',

  // Perfil
  'Datos: {origen}': 'Dades: {origen}',
  'Memoria (datos de prueba)': 'Memòria (dades de prova)',
  'Cerrar sesión': 'Tancar sessió',
  'Sin asignar': 'Sense assignar',
  'Sin registrar': 'Sense registrar',
  Ciclo: 'Cicle',
  Centro: 'Centre',
  Periodo: 'Període',
  Cuenta: 'Compte',
  Contacto: 'Contacte',
  Preferencias: 'Preferències',
  Tutoría: 'Tutoria',
  'Datos de empresa': "Dades d'empresa",
  'Cargo en el centro': 'Càrrec al centre',
  'Nombre y apellidos': 'Nom i cognoms',
  'Es tu correo para entrar: aquí lo cambias tú. Te pediremos confirmarlo desde el buzón.':
    'És el teu correu per entrar: aquí el canvies tu. Et demanarem que el confirmis des de la bústia.',
  'Estos datos los gestiona tu centro. Si alguno está mal, avisa a tu tutor.':
    'Aquestes dades les gestiona el teu centre. Si alguna és incorrecta, avisa el teu tutor.',
  'Avisar a mi tutor': 'Avisar el meu tutor',
  'Abre el chat para comunicar una incidencia': 'Obre el xat per comunicar una incidència',
  Teléfono: 'Telèfon',
  'En caso de emergencia': "En cas d'emergència",
  'Nombre del contacto': 'Nom del contacte',
  'Madre, padre, tutor legal…': 'Mare, pare, tutor legal…',
  'Teléfono del contacto': 'Telèfon del contacte',
  'Pendiente de validar por tu tutor': 'Pendent de validar pel teu tutor',
  Departamento: 'Departament',
  Informática: 'Informàtica',
  'Horario de tutoría': 'Horari de tutoria',
  'Martes de 15:00 a 16:00': 'Dimarts de 15:00 a 16:00',
  Cargo: 'Càrrec',
  'Responsable de desarrollo': 'Responsable de desenvolupament',
  'Coordinación FCT': 'Coordinació FCT',
  'Teléfono de trabajo': 'Telèfon de feina',
  'Centro de trabajo': 'Centre de treball',
  'Oficina de Barcelona': 'Oficina de Barcelona',
  'Avisos y notificaciones': 'Avisos i notificacions',
  'Tienes cambios sin guardar': 'Tens canvis sense desar',
  'Guardar cambios': 'Desar els canvis',
  'Cambios guardados': 'Canvis desats',
  'Correo actualizado': 'Correu actualitzat',
  'Te hemos enviado un enlace a {email} para confirmar el cambio. Hasta que lo confirmes, entra con el de siempre.':
    "T'hem enviat un enllaç a {email} per confirmar el canvi. Fins que no el confirmis, entra amb el de sempre.",
  'No se pudo guardar': "No s'ha pogut desar",
  'Idioma no válido': 'Idioma no vàlid',
  'Escribe tu nombre y apellidos': 'Escriu el teu nom i cognoms',
  'Contraseña nueva': 'Contrasenya nova',
  'Al menos 8 caracteres.': 'Com a mínim 8 caràcters.',
  'Repite la contraseña': 'Repeteix la contrasenya',
  'Cambiar contraseña': 'Canviar la contrasenya',
  'Las dos contraseñas no coinciden': 'Les dues contrasenyes no coincideixen',
  'Las contraseñas no coinciden': 'Les contrasenyes no coincideixen',
  'Contraseña cambiada': 'Contrasenya canviada',
  'No se pudo cambiar': "No s'ha pogut canviar",
  'La contraseña debe tener al menos 8 caracteres':
    'La contrasenya ha de tenir com a mínim 8 caràcters',
  'La contraseña nueva debe ser distinta de la actual':
    "La contrasenya nova ha de ser diferent de l'actual",
  'Esa contraseña es demasiado débil: prueba con una más larga':
    'Aquesta contrasenya és massa feble: prova amb una de més llarga',
  'Por seguridad, cierra sesión, vuelve a entrar e inténtalo de nuevo':
    'Per seguretat, tanca la sessió, torna a entrar i torna-ho a provar',
  'Mostrar DNI': 'Mostrar el DNI',
  'Ocultar DNI': 'Amagar el DNI',
  Mostrar: 'Mostrar',
  Ocultar: 'Amagar',
};
