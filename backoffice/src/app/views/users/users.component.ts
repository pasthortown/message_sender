import { Component, OnInit } from '@angular/core';
import { IconDirective } from '@coreui/icons-angular';
import {
  ButtonDirective,
  ColComponent,
  ContainerComponent,
  FormControlDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';
import Swal from 'sweetalert2';
import { UsersListComponent } from './users-list/users-list.component';
import { UserDialogComponent } from './user-dialog/user-dialog.component';
import { BackofficeService, BackofficeUser } from '../../services/backoffice.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  imports: [ContainerComponent, RowComponent, ColComponent, InputGroupComponent, InputGroupTextDirective, IconDirective, FormControlDirective, ButtonDirective, UserDialogComponent, UsersListComponent]
})

export class UsersComponent implements OnInit {
  users: BackofficeUser[] = [];
  loading = false;
  user_selected: any = {
    username: ''
  };

  constructor(private backoffice: BackofficeService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.backoffice.getAllUsers$().subscribe({
      next: (res) => {
        this.users = res.response ?? [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('[UsersComponent] getAllUsers error:', err);
      }
    });
  }

  selectedUser(user: any) {
    this.user_selected = user;
  }

  async saveButton(data: { id: number; username: string; password: string }) {
    // sanity check por si llega algo raro (ya validaste contraseñas en el hijo)
    const username = (data?.username ?? '').trim();
    const password = (data?.password ?? '').trim();
    const isUpdate = !!(data?.id && data.id > 0);

    if (!username || !password) {
      await Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Usuario y contraseña son obligatorios.'
      });
      return;
    }

    // Confirmación previa
    const confirm = await Swal.fire({
      title: isUpdate ? '¿Está seguro de actualizar los datos?' : '¿Está seguro de guardar los datos?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: isUpdate ? 'Sí, actualizar' : 'Sí, guardar',
      cancelButtonText: 'No, cancelar'
    });

    if (!confirm.isConfirmed) return;

    try {
      if (isUpdate) {
        // UPDATE
        await this.backoffice.updateUser({
          id: data.id,
          username,
          password
        });

        // recarga la lista
        this.loadUsers();

        await Swal.fire({
          icon: 'success',
          title: 'Usuario actualizado',
          text: 'La operación se realizó correctamente.'
        }).then(() => window.location.reload());
      } else {
        // CREATE
        const { response } = await this.backoffice.createUser({
          username,
          password
        });

        // opcional: seleccionar el creado si el WS devuelve id
        if (response?.id) {
          this.user_selected = response;
        }

        // recarga la lista
        this.loadUsers();

        Swal.fire({
          icon: 'success',
          title: 'Usuario creado',
          text: 'La operación se realizó correctamente.'
        }).then(() => window.location.reload());
      }
    } catch (err: any) {
      console.error('[UsersComponent] saveUser error:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message ?? 'Ocurrió un error al guardar el usuario.'
      });
    }
  }

  cancelButton(data: string) {
    this.user_selected = {
      username: ''
    };
  }
}
