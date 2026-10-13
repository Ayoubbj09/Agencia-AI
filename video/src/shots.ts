// Montaje calcado del vídeo de referencia: 30,6 s, 30 fps, 16:9.
// Cada plano busca su clip en public/clips/<id>.mp4. Si no está, se pinta un marcador.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_SECONDS = 30.6;

export const config = {
  // Usuario que aparece en el cierre.
  handle: "@tu_usuario",
  // Música opcional: public/music.mp3
  music: "music.mp3",
  // Etalonaje cálido como en la referencia.
  grade: true,
};

export type ClipId =
  | "01-dron-burj"
  | "02-dron-descenso"
  | "03-bugatti-trasera"
  | "04-lateral-ventanilla"
  | "05-perfil-cara"
  | "06a-cara-interior"
  | "06b-cuentakilometros"
  | "06c-cara-cerca"
  | "07-retrovisor"
  | "08-faros-frontal"
  | "09-trasera-alejandose"
  | "10-skyline-final";

export type Shot = {
  clip: ClipId;
  from: number; // segundos
  to: number; // segundos
  label: string;
  // Segundo del clip desde el que empieza (para reutilizar un clip en otro corte).
  offset?: number;
  // >1 acelera, <1 cámara lenta.
  speed?: number;
  face?: boolean;
};

export const shots: Shot[] = [
  { clip: "01-dron-burj", from: 0, to: 3.5, label: "Dron baja junto al Burj Khalifa" },
  { clip: "02-dron-descenso", from: 3.5, to: 7, label: "Dron desciende hacia la autopista" },
  { clip: "03-bugatti-trasera", from: 7, to: 9, label: "Bugatti desde detrás, a toda velocidad" },
  { clip: "04-lateral-ventanilla", from: 9, to: 12, label: "Dron al lado, hacia la ventanilla", face: true },
  { clip: "05-perfil-cara", from: 12, to: 14.4, label: "Tu perfil conduciendo", face: true },
  { clip: "06a-cara-interior", from: 14.4, to: 15.27, label: "Interior: luces sobre tu cara", face: true },
  { clip: "06b-cuentakilometros", from: 15.27, to: 16.3, label: "Cuentakilómetros subiendo" },
  { clip: "06c-cara-cerca", from: 16.3, to: 18, label: "Primer plano de tu cara", face: true },
  { clip: "07-retrovisor", from: 18, to: 20.73, label: "Tu cara en el retrovisor", face: true },
  { clip: "08-faros-frontal", from: 20.73, to: 21.97, label: "Bugatti de frente, faros" },
  // Ráfaga de cortes rápidos (21,97–24,1 s), reutiliza clips ya hechos.
  { clip: "07-retrovisor", from: 21.97, to: 22.4, label: "Ráfaga: retrovisor", offset: 1.5, face: true },
  { clip: "08-faros-frontal", from: 22.4, to: 22.83, label: "Ráfaga: faros", offset: 1.2 },
  { clip: "06b-cuentakilometros", from: 22.83, to: 23.27, label: "Ráfaga: cuentakilómetros", offset: 1.0 },
  { clip: "05-perfil-cara", from: 23.27, to: 23.7, label: "Ráfaga: perfil", offset: 2.5, face: true },
  { clip: "08-faros-frontal", from: 23.7, to: 24.1, label: "Ráfaga: faros", offset: 2.5 },
  { clip: "09-trasera-alejandose", from: 24.1, to: 26.6, label: "Bugatti se aleja" },
  { clip: "10-skyline-final", from: 26.6, to: 29.1, label: "Dron se aleja: skyline de Dubái" },
];

// Fundido a negro y cierre con el usuario.
export const FADE_OUT_FROM = 28.1;
export const END_CARD_FROM = 29.1;

export const sec = (s: number) => Math.round(s * FPS);
