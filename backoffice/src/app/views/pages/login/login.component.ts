import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { NgStyle } from '@angular/common';
import { IconDirective } from '@coreui/icons-angular';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardGroupComponent,
  ColComponent,
  ContainerComponent,
  FormControlDirective,
  FormDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';
import { BackofficeService } from '../../../services/backoffice.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    FormsModule,
    ContainerComponent, RowComponent, ColComponent,
    CardGroupComponent, CardComponent, CardBodyComponent,
    FormDirective, InputGroupComponent, InputGroupTextDirective,
    IconDirective, FormControlDirective, ButtonDirective,
    NgStyle
  ]
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;

  constructor(
    private backoffice: BackofficeService,
    private router: Router
  ) {}

  async login() {
    const username = this.username.trim();
    const password = this.password.trim();

    if (!username || !password) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Ingrese usuario y contraseña.'
      });
      return;
    }

    this.loading = true;
    try {
      const res = await this.backoffice.login({ username, password });

      if (res.allowed) {
        // ✅ Persistir sesión para que el guard permita navegar
        sessionStorage.setItem('username', res.username || '');

        // Redirigir al dashboard
        await this.router.navigateByUrl('/dashboard');
        return;
      }

      await Swal.fire({
        icon: 'error',
        title: 'Acceso denegado',
        text: 'Usuario o contraseña incorrectos o no tiene permisos.'
      });
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message ?? 'No se pudo iniciar sesión.'
      });
    } finally {
      this.loading = false;
    }
  }

}
