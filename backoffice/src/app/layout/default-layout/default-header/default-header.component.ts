import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

import {
  AvatarComponent,
  BadgeComponent,
  BreadcrumbRouterComponent,
  ColorModeService,
  ContainerComponent,
  DropdownComponent,
  DropdownDividerDirective,
  DropdownHeaderDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownToggleDirective,
  HeaderComponent,
  HeaderNavComponent,
  HeaderTogglerDirective,
  NavItemComponent,
  NavLinkDirective,
  SidebarToggleDirective
} from '@coreui/angular';

import { IconDirective } from '@coreui/icons-angular';

@Component({
  selector: 'app-default-header',
  standalone: true,
  templateUrl: './default-header.component.html',
  imports: [
    ContainerComponent, HeaderTogglerDirective, SidebarToggleDirective,
    IconDirective, HeaderNavComponent, NavItemComponent, NavLinkDirective,
    RouterLink, RouterLinkActive, NgTemplateOutlet, BreadcrumbRouterComponent,
    DropdownComponent, DropdownToggleDirective, AvatarComponent,
    DropdownMenuDirective, DropdownHeaderDirective, DropdownItemDirective,
    BadgeComponent, DropdownDividerDirective
  ]
})
export class DefaultHeaderComponent extends HeaderComponent implements OnInit {

  /** Muestra el usuario en el header; por defecto pide iniciar sesión */
  username = 'Inicie Sesión';

  /** Color mode */
  readonly #colorModeService = inject(ColorModeService);
  readonly colorMode = this.#colorModeService.colorMode;

  readonly colorModes = [
    { name: 'light', text: 'Light', icon: 'cilSun' },
    { name: 'dark',  text: 'Dark',  icon: 'cilMoon' },
    { name: 'auto',  text: 'Auto',  icon: 'cilContrast' }
  ];

  readonly icons = computed(() => {
    const currentMode = this.colorMode();
    return this.colorModes.find(mode => mode.name === currentMode)?.icon ?? 'cilSun';
  });

  /** Router para navegación en logout */
  private readonly router = inject(Router);

  constructor() {
    super();
  }

  /** Id del sidebar (CoreUI) */
  sidebarId = input('sidebar1');

  // ========= Ciclo de vida =========
  ngOnInit(): void {
    this.refreshUsernameFromSession();
  }

  // ========= Acciones =========
  logout(): void {
    // Limpia la sesión (puedes usar removeItem('username') si prefieres)
    sessionStorage.clear();
    // Refresca el nombre mostrado
    this.username = 'Inicie Sesión';
    // Redirige al login
    this.router.navigateByUrl('/login');
  }

  // ========= Helpers =========
  private refreshUsernameFromSession(): void {
    const u = (sessionStorage.getItem('username') ?? '').trim();
    this.username = u !== '' ? u : 'Inicie Sesión';
  }
}
