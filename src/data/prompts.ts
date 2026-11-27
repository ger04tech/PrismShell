/**
 * Curated Oh My Posh themes (names checked against JanDeDobbeleer/oh-my-posh/themes).
 * We download the theme file into %APPDATA%\PrismShell\themes and point $PROFILE at it,
 * instead of relying on $env:POSH_THEMES_PATH.
 */
export interface PromptTheme {
  id: string;
  label: string;
  description: string;
  /** Uses powerline glyphs/icons: needs a Nerd Font. */
  needsNerdFont: boolean;
}

export const OMP_THEME_URL = (id: string) =>
  `https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/${id}.omp.json`;

export const PROMPT_THEMES: PromptTheme[] = [
  { id: "atomic", label: "Atomic", description: "Colorido, con hora, batería y git", needsNerdFont: true },
  { id: "jandedobbeleer", label: "Jan De Dobbeleer", description: "El tema del autor: bloques de colores", needsNerdFont: true },
  { id: "paradox", label: "Paradox", description: "Clásico estilo powerline", needsNerdFont: true },
  { id: "powerlevel10k_rainbow", label: "Powerlevel10k Rainbow", description: "Arcoíris inspirado en zsh", needsNerdFont: true },
  { id: "agnoster", label: "Agnoster", description: "El powerline de toda la vida", needsNerdFont: true },
  { id: "catppuccin_mocha", label: "Catppuccin Mocha", description: "Pastel, combina con Catppuccin", needsNerdFont: true },
  { id: "tokyonight_storm", label: "Tokyo Night Storm", description: "Combina con Tokyo Night", needsNerdFont: true },
  { id: "dracula", label: "Dracula", description: "Morado y rosa, combina con Dracula", needsNerdFont: true },
  { id: "night-owl", label: "Night Owl", description: "Azul nocturno con detalles cálidos", needsNerdFont: true },
  { id: "gruvbox", label: "Gruvbox", description: "Tonos tierra retro", needsNerdFont: true },
  { id: "nordtron", label: "Nordtron", description: "Frío y limpio, combina con Nord", needsNerdFont: true },
  { id: "cobalt2", label: "Cobalt2", description: "Azul intenso con amarillo", needsNerdFont: true },
  { id: "M365Princess", label: "M365 Princess", description: "Rosa y morado, muy vistoso", needsNerdFont: true },
  { id: "takuya", label: "Takuya", description: "Minimalista con iconos", needsNerdFont: true },
  { id: "spaceship", label: "Spaceship", description: "Una línea, inspirado en zsh", needsNerdFont: true },
  { id: "clean-detailed", label: "Clean Detailed", description: "Mucha información, ordenada", needsNerdFont: true },
  { id: "quick-term", label: "Quick Term", description: "Compacto y rápido de leer", needsNerdFont: true },
  { id: "multiverse-neon", label: "Multiverse Neon", description: "Neón brillante", needsNerdFont: true },
  { id: "bubblesline", label: "Bubblesline", description: "Burbujas redondeadas", needsNerdFont: true },
  { id: "craver", label: "Craver", description: "Dos líneas, muy pulido", needsNerdFont: true },
  { id: "pure", label: "Pure", description: "Minimalista, casi sin iconos", needsNerdFont: false },
  { id: "robbyrussell", label: "Robby Russell", description: "El clásico de oh-my-zsh", needsNerdFont: false },
  { id: "zash", label: "Zash", description: "Sencillo y legible", needsNerdFont: false },
  { id: "ys", label: "YS", description: "Una línea con usuario y ruta", needsNerdFont: false },
];
