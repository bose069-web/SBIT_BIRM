import { Pantalla } from '@/ui/components/pantalla';

import { EstadoVacio } from './comun';

/** Chat por alumno (alumno, profe, tutor de empresa e instituto). Llega cuando PC 2 y PC 3 lo tengan. */
export function VistaChat() {
  return (
    <Pantalla titulo="Chat" subtitulo="Habla con tu profe, la empresa y el instituto">
      <EstadoVacio
        titulo="Muy pronto"
        texto="Aquí tendrás un chat por cada alumno en prácticas, con todas las personas que lo siguen."
      />
    </Pantalla>
  );
}
