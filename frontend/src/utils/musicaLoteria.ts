// Musica de la loteria: un sonecito en 6/8 (ritmo de chilena) tocado "en marimba",
// con la melodia en terceras paralelas y las notas largas "redobladas" como lo hacen
// los marimbistas. Lo genera el navegador con Web Audio: no hay archivos de audio.

const OCTAVO = 0.17; // segundos que dura un octavo (6 octavos = un compas de 6/8)

const frecuencia = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// escala de Sol mayor (en numeros MIDI), para sacar la tercera de abajo de cada nota
const SOL_MAYOR = [55, 57, 59, 60, 62, 64, 66, 67, 69, 71, 72, 74, 76, 78, 79, 81];
const terceraAbajo = (midi: number) => SOL_MAYOR[SOL_MAYOR.indexOf(midi) - 2] ?? midi - 4;

// melodia: [nota, cuantos octavos dura] (null = silencio). 8 compases de 6 octavos
// G4=67 A4=69 B4=71 C5=72 D5=74 E5=76 F#4=66 D4=62
const MELODIA: [number | null, number][] = [
  [71, 2], [69, 1], [67, 2], [71, 1], // Sol
  [74, 3], [71, 2], [67, 1], // Sol
  [72, 2], [71, 1], [69, 2], [66, 1], // Re
  [69, 2], [66, 1], [62, 3], // Re
  [66, 2], [69, 1], [72, 2], [69, 1], // Re
  [71, 2], [72, 1], [74, 3], // Re
  [76, 2], [74, 1], [72, 2], [69, 1], // Sol (sube y baja)
  [67, 3], [null, 3], // Sol
];

// acorde de cada compas: bajo (raiz y quinta) y las notas del "pa-pa"
const ACORDES = [
  { raiz: 43, quinta: 50, notas: [59, 62] }, // Sol
  { raiz: 43, quinta: 50, notas: [59, 62] },
  { raiz: 38, quinta: 45, notas: [57, 60] }, // Re7
  { raiz: 38, quinta: 45, notas: [57, 60] },
  { raiz: 38, quinta: 45, notas: [57, 60] },
  { raiz: 38, quinta: 45, notas: [57, 60] },
  { raiz: 43, quinta: 50, notas: [59, 62] }, // Sol
  { raiz: 43, quinta: 50, notas: [59, 62] },
];

const TOTAL_OCTAVOS = ACORDES.length * 6;

// en que octavo empieza cada nota de la melodia
const NOTAS_POR_OCTAVO = (() => {
  const mapa = new Map<number, { midi: number; octavos: number }>();
  let octavo = 0;
  for (const [midi, octavos] of MELODIA) {
    if (midi !== null) mapa.set(octavo, { midi, octavos });
    octavo += octavos;
  }
  return mapa;
})();

// un golpe de marimba: la nota base mas su armonico 4 (el "brillo" de la tecla de madera)
const golpe = (ctx: AudioContext, destino: AudioNode, midi: number, t: number, volumen: number, duracion = 0.5) => {
  const f = frecuencia(midi);
  for (const [multiplo, nivel, caida] of [
    [1, 1, duracion],
    [4, 0.22, 0.09],
    [9.2, 0.05, 0.03],
  ]) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f * multiplo;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(volumen * nivel, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + caida);
    osc.connect(env).connect(destino);
    osc.start(t);
    osc.stop(t + caida + 0.05);
  }
};

// nota larga "redoblada": golpes rapidos seguidos, como el tremolo de la marimba
const redoble = (ctx: AudioContext, destino: AudioNode, midi: number, t: number, duracion: number, volumen: number) => {
  for (let i = 0; t + i * 0.065 < t + duracion - 0.04; i++) {
    golpe(ctx, destino, midi, t + i * 0.065, volumen * (i === 0 ? 1 : 0.55), 0.18);
  }
};

const bajo = (ctx: AudioContext, destino: AudioNode, midi: number, t: number) => {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = frecuencia(midi);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(0.32, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t + OCTAVO * 2.6);
  osc.connect(env).connect(destino);
  osc.start(t);
  osc.stop(t + OCTAVO * 3);
};

export class MusicaLoteria {
  private ctx: AudioContext | null = null;
  private maestro: GainNode | null = null;
  private reloj: ReturnType<typeof setInterval> | undefined;
  private siguiente = 0;
  private octavo = 0;
  sonando = false;

  private preparar() {
    if (!this.ctx) {
      const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Contexto();
      this.maestro = this.ctx.createGain();
      this.maestro.gain.value = 0;
      this.maestro.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return { ctx: this.ctx, maestro: this.maestro! };
  }

  // empieza (o sigue) la musica, subiendo el volumen poco a poco
  iniciar() {
    const { ctx, maestro } = this.preparar();
    const ahora = ctx.currentTime;
    maestro.gain.cancelScheduledValues(ahora);
    maestro.gain.setValueAtTime(maestro.gain.value, ahora);
    maestro.gain.linearRampToValueAtTime(0.35, ahora + 0.8);
    if (this.sonando) return;
    this.sonando = true;
    this.siguiente = ahora + 0.05;
    this.octavo = 0;
    // se programan las notas un poquito antes de que suenen, para que no se atrasen
    this.reloj = setInterval(() => this.programar(), 50);
    this.programar();
  }

  private programar() {
    const { ctx, maestro } = this.preparar();
    while (this.siguiente < ctx.currentTime + 0.25) {
      const t = this.siguiente;
      const enCompas = this.octavo % 6;
      const acorde = ACORDES[Math.floor(this.octavo / 6)];

      // bajo en el 1 y en el 4; el "pa-pa" en el 3 y el 6 (el columpio de la chilena)
      if (enCompas === 0) bajo(ctx, maestro, acorde.raiz, t);
      if (enCompas === 3) bajo(ctx, maestro, acorde.quinta, t);
      if (enCompas === 2 || enCompas === 5) {
        for (const nota of acorde.notas) golpe(ctx, maestro, nota, t, 0.09, 0.2);
      }

      const nota = NOTAS_POR_OCTAVO.get(this.octavo);
      if (nota) {
        const duracion = nota.octavos * OCTAVO;
        for (const midi of [nota.midi, terceraAbajo(nota.midi)]) {
          if (nota.octavos >= 3) redoble(ctx, maestro, midi, t, duracion, 0.16);
          else golpe(ctx, maestro, midi, t, 0.2, Math.min(duracion + 0.25, 0.6));
        }
      }

      this.siguiente += OCTAVO;
      this.octavo = (this.octavo + 1) % TOTAL_OCTAVOS;
    }
  }

  // baja el volumen y deja de tocar
  detener(segundos = 1.5) {
    if (!this.ctx || !this.maestro || !this.sonando) return;
    const ahora = this.ctx.currentTime;
    this.maestro.gain.cancelScheduledValues(ahora);
    this.maestro.gain.setValueAtTime(this.maestro.gain.value, ahora);
    this.maestro.gain.linearRampToValueAtTime(0, ahora + segundos);
    clearInterval(this.reloj);
    this.sonando = false;
  }

  // "tiriri" de tres notas cuando se voltea una carta
  voltear() {
    const { ctx, maestro } = this.preparar();
    const t = ctx.currentTime + 0.02;
    // si la musica estaba apagada, el efecto igual se oye
    if (!this.sonando) {
      maestro.gain.cancelScheduledValues(t);
      maestro.gain.setValueAtTime(0.35, t);
    }
    [79, 83, 86].forEach((midi, i) => golpe(ctx, maestro, midi, t + i * 0.07, 0.18, 0.4));
  }

  cerrar() {
    clearInterval(this.reloj);
    this.sonando = false;
    void this.ctx?.close();
    this.ctx = null;
    this.maestro = null;
  }
}
