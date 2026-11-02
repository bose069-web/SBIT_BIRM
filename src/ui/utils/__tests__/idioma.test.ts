import { fechaCorta, fechaLarga, nombreMes } from '../fechas';
import { fijarIdioma, t, tPlural } from '../idioma';
import { CATALAN } from '../traducciones/ca';

afterEach(() => fijarIdioma('es'));

describe('t', () => {
  it('en castellano devuelve el texto tal cual', () => {
    expect(t('Cerrar sesión')).toBe('Cerrar sesión');
  });

  it('en catalán usa la traducción y, si falta, el castellano', () => {
    fijarIdioma('ca');
    expect(t('Cerrar sesión')).toBe('Tancar sessió');
    expect(t('Texto que nadie ha traducido')).toBe('Texto que nadie ha traducido');
  });

  it('rellena las variables en los dos idiomas', () => {
    const texto = 'Datos: {origen}';
    expect(t(texto, { origen: 'Supabase' })).toBe('Datos: Supabase');
    expect(t(texto, { origen: 'Supabase' }, 'ca')).toBe('Dades: Supabase');
  });

  it('elige singular o plural', () => {
    expect(tPlural(1, '{n} día', '{n} días')).toBe('1 día');
    expect(tPlural(3, '{n} día', '{n} días')).toBe('3 días');
  });
});

describe('fechas en catalán', () => {
  it('meses y días en catalán, con apóstrofo delante de vocal', () => {
    fijarIdioma('ca');
    expect(nombreMes('2026-11')).toBe('novembre 2026');
    expect(fechaCorta('2026-03-02')).toBe('2 març 2026');
    expect(fechaLarga('2026-10-27')).toBe("dimarts 27 d'octubre");
    expect(fechaLarga('2026-11-02')).toBe('dilluns 2 de novembre');
  });
});

// Jest corre en Node; el proyecto no tiene los tipos de Node, así que se declaran los que se usan.
declare function require(modulo: string): unknown;
declare const __dirname: string;
const { readdirSync, readFileSync, statSync } = require('fs') as {
  readdirSync(ruta: string): string[];
  readFileSync(ruta: string, codificacion: 'utf8'): string;
  statSync(ruta: string): { isDirectory(): boolean };
};
const { join } = require('path') as { join(...partes: string[]): string };

// Todos los textos fijos que pasan por t() en el código tienen que estar traducidos.
function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return nombre === '__tests__' ? [] : archivos(ruta);
    return /\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

describe('diccionario catalán', () => {
  const raiz = join(__dirname, '..', '..', '..');
  const usados = new Set<string>();
  for (const archivo of archivos(raiz)) {
    const codigo = readFileSync(archivo, 'utf8');
    for (const m of codigo.matchAll(/\b(?:t|traducir)\(\s*'((?:[^'\\]|\\.)*)'/g)) {
      usados.add(m[1].replace(/\\'/g, "'"));
    }
  }

  it('tiene traducción para cada texto usado con t()', () => {
    expect([...usados].filter((texto) => !(texto in CATALAN))).toEqual([]);
  });

  it('mantiene las mismas variables entre llaves', () => {
    const marcas = (texto: string) => (texto.match(/\{\w+\}/g) ?? []).sort().join();
    const distintas = Object.entries(CATALAN).filter(([es, ca]) => marcas(es) !== marcas(ca));
    expect(distintas).toEqual([]);
  });
});
