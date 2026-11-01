# Third-party notices

Chatto is licensed under GPL-3.0-or-later. It bundles the following third-party works, each under its own license.

## Fonts

| Font                                                                                             | Use                                                   | License                   |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------- |
| [jf open 粉圓（Huninn）](https://github.com/justfont/open-huninn-font), via `@fontsource/huninn` | Control panel UI, optional chat font                  | SIL Open Font License 1.1 |
| [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), via `@fontsource/jetbrains-mono`   | Numbers and code in the control panel, mono chat font | SIL Open Font License 1.1 |
| [Noto Sans TC](https://github.com/notofonts/noto-cjk), via `@fontsource-variable/noto-sans-tc`   | Chat font (思源黑體)                                  | SIL Open Font License 1.1 |
| [Noto Serif TC](https://github.com/notofonts/noto-cjk), via `@fontsource-variable/noto-serif-tc` | Chat font (思源宋體)                                  | SIL Open Font License 1.1 |

Fonts are distributed alongside the program as separate works; the OFL license texts ship in the respective packages.

## Sounds

Built-in alert sounds are vendored from [soundcn](https://github.com/kapishdima/soundcn) into `packages/chat-ui/src/soundcn/`. soundcn's code is MIT (© 2026 KapishDima); every sound Chatto ships is CC0 1.0 (public domain) by [Kenney](https://kenney.nl). soundcn's Blizzard-licensed collection is not used.

| Chatto name | soundcn sound            | Author | License |
| ----------- | ------------------------ | ------ | ------- |
| 茶杯輕敲    | `impact-glass-light-004` | Kenney | CC0     |
| 和弦        | `two-tone-1`             | Kenney | CC0     |
| 泡泡        | `notification-pop`       | Kenney | CC0     |
| 鈴聲        | `impact-bell-heavy-004`  | Kenney | CC0     |
| 撥弦        | `jingles-pizzi-10`       | Kenney | CC0     |
| 金幣        | `coin-collect`           | Kenney | CC0     |
| 升級        | `power-up-5`             | Kenney | CC0     |

## Libraries

| Library                                                                                                                                                              | License    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| [Motion](https://motion.dev) (`motion`)                                                                                                                              | MIT        |
| [Lucide](https://lucide.dev) (`lucide-react`)                                                                                                                        | ISC        |
| [React](https://react.dev)                                                                                                                                           | MIT        |
| [Tailwind CSS](https://tailwindcss.com)                                                                                                                              | MIT        |
| [Electron](https://www.electronjs.org)                                                                                                                               | MIT        |
| [ws](https://github.com/websockets/ws)                                                                                                                               | MIT        |
| [shadcn/ui](https://ui.shadcn.com) (components copied into `components/ui`)                                                                                          | MIT        |
| [Magic UI](https://magicui.design) (`magic-card`, `border-beam`, `confetti`, copied into `components/ui`)                                                            | MIT        |
| [Radix UI](https://www.radix-ui.com) (`radix-ui`)                                                                                                                    | MIT        |
| [Kibo UI](https://www.kibo-ui.com) (color picker, status, pill, snippet, theme switcher, spinner, choicebox, tags; adapted copies in `components/kibo-ui/`)          | MIT        |
| [cmdk](https://cmdk.paco.me), [@radix-ui/react-use-controllable-state](https://www.radix-ui.com)                                                                     | MIT        |
| [color](https://github.com/Qix-/color) (with `color-convert`, `color-string`, `color-name`)                                                                          | MIT        |
| [CodeMirror 6](https://codemirror.net) (`codemirror`, `@codemirror/*`, `@lezer/*`, `style-mod`, `w3c-keyname`, `crelt`)                                              | MIT        |
| [canvas-confetti](https://github.com/catdad/canvas-confetti)                                                                                                         | ISC        |
| [class-variance-authority](https://cva.style)                                                                                                                        | Apache-2.0 |
| [clsx](https://github.com/lukeed/clsx), [tailwind-merge](https://github.com/dcastil/tailwind-merge), [tw-animate-css](https://github.com/Wombosvideo/tw-animate-css) | MIT        |

Animations are Chatto's own implementation on top of Motion, plus the MIT-licensed shadcn/ui and Magic UI components listed above (Magic Card was adapted to read Chatto's theme instead of next-themes). Animate UI and React Bits are intentionally not used: their MIT + Commons Clause license is not compatible with GPL-3.0.
