// Fluent 2 color icons (the Windows 11 / Office style), MIT licensed by Microsoft.
import {
  CheckmarkCircle16Color,
  CheckmarkCircle24Color,
  CodeBlock16Color,
  CodeBlock24Color,
  Home16Color,
  Home24Color,
  Image16Color,
  Image24Color,
  PaintBrush16Color,
  PaintBrush24Color,
  TextEditStyle16Color,
  TextEditStyle24Color,
  type FluentIcon,
} from "@fluentui/react-icons";
import type { ScreenId } from "@/core/store";
import { t } from "@/i18n/es";

export interface NavItem {
  id: ScreenId;
  label: string;
  /** 16 px grid for the 13 px tabs, 24 px grid for the screen titles (never scaled across grids). */
  icon: FluentIcon;
  titleIcon: FluentIcon;
}

export const NAV: NavItem[] = [
  { id: "home", label: t.nav.home, icon: Home16Color, titleIcon: Home24Color },
  { id: "themes", label: t.nav.themes, icon: PaintBrush16Color, titleIcon: PaintBrush24Color },
  { id: "font", label: t.nav.font, icon: TextEditStyle16Color, titleIcon: TextEditStyle24Color },
  { id: "background", label: t.nav.background, icon: Image16Color, titleIcon: Image24Color },
  { id: "prompt", label: t.nav.prompt, icon: CodeBlock16Color, titleIcon: CodeBlock24Color },
  { id: "apply", label: t.nav.apply, icon: CheckmarkCircle16Color, titleIcon: CheckmarkCircle24Color },
];
