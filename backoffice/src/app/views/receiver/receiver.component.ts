import { Component, OnInit } from '@angular/core';
import { IconDirective } from '@coreui/icons-angular';
import {
  ButtonCloseDirective,
  ButtonDirective,
  ColComponent,
  ContainerComponent,
  FormControlDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalTitleDirective,
  ModalToggleDirective,
  RowComponent
} from '@coreui/angular';
import { UsersComponent } from './users/users.component';
import { GroupsComponent } from './groups/groups.component';
import { UserDetailsComponent } from './user-details/user-details.component';
import { GroupDetailsComponent } from './group-details/group-details.component';
import { CatalogService } from './../../services/catalog.service';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';

// ====== Tipos ======
export interface GroupItem {
  grupo: string;
  members: Array<{ email: string; item_id: number }>;
}

export interface UserItem {
  item_id?: number;
  name?: string;
  email: string;
  groups: string[];
}

@Component({
  selector: 'app-receiver',
  standalone: true,
  templateUrl: './receiver.component.html',
  styleUrls: ['./receiver.component.scss'],
  imports: [
    FormsModule,
    ModalBodyComponent,
    ModalComponent,
    ModalFooterComponent,
    ModalHeaderComponent,
    ModalTitleDirective,
    ModalToggleDirective,
    UserDetailsComponent,
    GroupDetailsComponent,
    UsersComponent,
    GroupsComponent,
    ContainerComponent,
    RowComponent,
    ColComponent,
    InputGroupComponent,
    InputGroupTextDirective,
    IconDirective,
    FormControlDirective,
    ButtonCloseDirective,
    ButtonDirective
  ]
})
export class ReceiverComponent implements OnInit {

  // ====== Estado UI ======
  visibleUserDetails = false;
  visibleGroupDetails = false;
  visibleAddUsersToGroup = false;
  loading = false;

  // ====== Datos base ======
  toAddUsers: any[] = [];
  users: any[] = [];
  users_groups: any[] = [];
  groupsToAdd: any[] = [];
  newGroupName: string = '';

  // ====== Selecciones ======
  user_selected: UserItem | null = null;
  group_selected: GroupItem | null = null;

  // Estructura para pintar grupos en la vista
  groups: Array<{ grupo: string; select?: boolean; miembros: Array<{ email: string; item_id: number }> }> = [];

  // Índice: email/username (full y local) -> item_id
  private emailToId = new Map<string, number>();

  constructor(private catalogService: CatalogService) {}

  async ngOnInit(): Promise<void> {
    await this.getUsers();
  }

  // =================== HELPERS ===================
  private norm = (s: unknown) => (s ?? '').toString().trim().toLowerCase();

  private local = (s: string) => {
    const at = s.indexOf('@');
    return at >= 0 ? s.slice(0, at) : s;
    // Si viene "luis.salazar" sin @, devuelve igual
  };

  /** Construye índice email/username (full y local) -> item_id */
  private buildEmailIndex() {
    this.emailToId.clear();
    for (const u of this.users ?? []) {
      const id = Number(u?.item_id ?? u?.id ?? 0);
      const emailA = this.norm(u?.email);
      const userA  = this.norm(u?.username);

      if (emailA) {
        this.emailToId.set(emailA, id);
        this.emailToId.set(this.norm(this.local(emailA)), id);
      }
      if (userA) {
        this.emailToId.set(userA, id);
        this.emailToId.set(this.norm(this.local(userA)), id);
      }
    }
  }

  /** Dado un email/username bruto, devuelve el item_id si existe en índice */
  private lookupItemId(emailOrUserRaw: string): number {
    const kFull  = this.norm(emailOrUserRaw);
    const kLocal = this.norm(this.local(emailOrUserRaw));
    return this.emailToId.get(kFull) ?? this.emailToId.get(kLocal) ?? 0;
  }

  /** Construye un UserItem a partir de un posible objeto de usuario o un email */
  private buildUserItem(userLike: any): UserItem {
    // Preferimos email, si no, username
    const emailRaw: string = userLike?.email ?? userLike?.username ?? '';
    const id = this.lookupItemId(emailRaw);

    // Grupos del usuario tomando users_groups
    const groupsSet = new Set<string>();
    for (const ug of this.users_groups ?? []) {
      const ugEmail = ug?.email ?? ug?.username ?? '';
      const ugFull  = this.norm(ugEmail);
      const ugLocal = this.norm(this.local(ugEmail));
      const uFull   = this.norm(emailRaw);
      const uLocal  = this.norm(this.local(emailRaw));
      if (ugFull === uFull || ugLocal === uLocal) {
        const g = ug?.group ?? ug?.grupo;
        if (g) groupsSet.add(g);
      }
    }

    return {
      item_id: id || undefined,
      name: userLike?.name ?? userLike?.nombre ?? userLike?.username ?? undefined,
      email: emailRaw,
      groups: Array.from(groupsSet)
    };
  }

  /** Construye un GroupItem por nombre de grupo, con members {email,item_id} */
  private buildGroupItem(groupLike: any): GroupItem {
    const groupName: string = typeof groupLike === 'string'
      ? groupLike
      : (groupLike?.grupo ?? groupLike?.group ?? 'Sin grupo');

    const dedup = new Map<string, { email: string; item_id: number }>();

    for (const ug of this.users_groups ?? []) {
      const g = ug?.group ?? ug?.grupo ?? '';
      if (g !== groupName) continue;

      const emailRaw: string = ug?.email ?? ug?.username ?? '';
      const key = this.norm(emailRaw) || this.norm(this.local(emailRaw)) || emailRaw;

      if (!dedup.has(key)) {
        dedup.set(key, { email: emailRaw, item_id: this.lookupItemId(emailRaw) });
      }
    }

    return {
      grupo: groupName,
      members: Array.from(dedup.values())
    };
  }

  // =================== DATA FETCH ===================

  /** Carga usuarios y, si es exitoso, encadena a getUsersGroups() */
  async getUsers() {
    this.loading = true;
    try {
      const { response } = await this.catalogService.list<any>('users');
      this.users = response ?? [];
      this.buildEmailIndex();           // construir índice apenas haya usuarios
      await this.getUsersGroups();
    } catch (err) {
      console.error('Error cargando Usuarios:', err);
      this.users = [];
      this.emailToId.clear();
    } finally {
      this.loading = false;
    }
  }

  /** Carga la colección usersgroup (todos los documentos) y arma los grupos */
  async getUsersGroups() {
    this.loading = true;
    try {
      const { response } = await this.catalogService.list<any>('usersgroup');
      this.users_groups = response ?? [];
      this.build_groups();
      this.buscar_usuarios_huerfanos();
    } catch (err) {
      console.error('Error cargando UsersGroup:', err);
      this.users_groups = [];
      this.groups = [];
    } finally {
      this.loading = false;
    }
  }

  // =================== BUILD GROUPS (para la vista principal) ===================

  build_groups() {
    const groupsMap = new Map<string, Map<string, { email: string; item_id: number }>>();

    for (const ug of this.users_groups ?? []) {
      const groupName: string = ug?.group ?? ug?.grupo ?? 'Sin grupo';
      const emailRaw: string = ug?.email ?? ug?.username ?? '';

      const kFull  = this.norm(emailRaw);
      const kLocal = this.norm(this.local(emailRaw));
      const item_id = this.lookupItemId(emailRaw);

      if (!groupsMap.has(groupName)) groupsMap.set(groupName, new Map());
      const membersMap = groupsMap.get(groupName)!;

      // clave de deduplicación (prefiere full email, si no, local)
      const dedupKey = kFull || kLocal || emailRaw;
      if (!membersMap.has(dedupKey)) {
        membersMap.set(dedupKey, { email: emailRaw, item_id });
      }
    }

    // Volcar a arreglo destino
    this.groups = Array.from(groupsMap.entries()).map(([grupo, members]) => ({
      grupo,
      select: false,
      miembros: Array.from(members.values())
    }));
  }

  /** Marca sin_grupo=true a quienes no pertenezcan a ningún grupo */
  private buscar_usuarios_huerfanos(): void {
    // 1) Armar set de claves (full y local) para todos los usuarios que SÍ tienen grupo
    const asignados = new Set<string>();

    for (const ug of this.users_groups ?? []) {
      const em = (ug?.email ?? ug?.username ?? '').toString();
      const f  = this.norm(em);
      const l  = this.norm(this.local(em));
      if (f) asignados.add(f);
      if (l) asignados.add(l);
    }

    // 2) Marcar en this.users si es huérfano (sin grupo) o no
    for (const u of this.users ?? []) {
      const em = (u?.email ?? u?.username ?? '').toString();
      const f  = this.norm(em);
      const l  = this.norm(this.local(em));
      const tieneGrupo = asignados.has(f) || asignados.has(l);
      u.sin_grupo = !tieneGrupo; // true si NO aparece en ninguna asignación
    }

    this.users = this.users.map(u => ({ ...u }));
  }

  // =================== UI Handlers ===================

  handleChangeVisibleAddUsersToGroup(_event: any) {
    // lógica si aplica
  }

  handleChangeVisibleUserDetails(_event: any) {
    // lógica si aplica
  }

  cancelarUserDetails() { this.visibleUserDetails = false; }

  handleChangeVisibleGroupDetails(_event: any) {
    // lógica si aplica
  }
  cancelarGroupDetails() { this.visibleGroupDetails = false; }

  // ---- Requeridos: arman objetos completos para los modales ----

  /** Abre el detalle de USUARIO con UserItem completo (item_id + groups) */
  showUserDetail(user: any) {
    this.user_selected = this.buildUserItem(user);
    this.visibleUserDetails = true;
  }

  /** Abre el detalle de GRUPO con GroupItem completo (members con item_id) */
  showGroupDetail(group: any) {
    this.group_selected = this.buildGroupItem(group);
    this.visibleGroupDetails = true;
  }

  // ---- Listas seleccionadas (si aplican) ----
  // ---- Listas seleccionadas (si aplican) ----
  async deleteSelectedGroups(groups: Array<{ grupo: string }>) {
    try {
      // 1) Validaciones rápidas
      const groupNames = (groups ?? [])
        .map(g => (g?.grupo ?? g as any)?.toString().trim())
        .filter(Boolean);

      if (!groupNames.length) {
        await Swal.fire({
          icon: 'info',
          title: 'Sin grupos seleccionados',
          text: 'Selecciona al menos un grupo para continuar.'
        });
        return;
      }

      // 2) Confirmación
      const res = await Swal.fire({
        icon: 'warning',
        title: '¿Eliminar asignaciones de estos grupos?',
        html: `
          <div class="text-start">
            <p>Se eliminarán los siguientes grupos:</p>
            <ul style="text-align:left; max-height:180px; overflow:auto; margin:0;">
              ${groupNames.map(n => `<li><code>${n}</code></li>`).join('')}
            </ul>
            <p class="mt-2"><b>Esta acción no se puede deshacer.</b></p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        confirmButtonColor: '#d33'
      });

      if (!res.isConfirmed) return;

      this.loading = true;

      // 3) Filtrar en memoria todas las asignaciones usersgroup que pertenecen a esos grupos
      //    y tomar sus item_id para borrarlas una por una.
      const itemIdsToDelete: number[] = (this.users_groups ?? [])
        .filter(ug => groupNames.includes((ug?.group ?? ug?.grupo ?? '').toString().trim()))
        .map(ug => Number(ug?.item_id ?? ug?.id))
        .filter(id => Number.isFinite(id) && id > 0);

      if (!itemIdsToDelete.length) {
        await Swal.fire({
          icon: 'info',
          title: 'No hay asignaciones que eliminar',
          text: 'No se encontraron documentos en usersgroup para los grupos seleccionados.'
        });
        return;
      }

      // 4) Borrar en backend (DELETE /usersgroup?id=ITEM_ID)
      //    Usamos allSettled para continuar aunque alguno falle.
      const results = await Promise.allSettled(
        itemIdsToDelete.map(id => this.catalogService.delete('usersgroup', id)) // DELETE con ?id=123
      );

      const ok = results.filter(r => r.status === 'fulfilled').length;
      const fail = results.length - ok;

      // 5) Refrescar datos y vista
      await this.getUsersGroups();  // vuelve a armar this.users_groups y this.groups

      // 6) Resumen
      await Swal.fire({
        icon: fail ? 'warning' : 'success',
        title: fail ? 'Eliminación parcial' : 'Eliminación completada',
        html: `
          <div class="text-start">
            <p><b>Intentos:</b> ${results.length}</p>
            <p><b>Eliminados:</b> ${ok}</p>
            <p><b>Fallidos:</b> ${fail}</p>
          </div>
        `
      });
    } catch (err) {
      console.error('Error al eliminar grupos:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema eliminando las asignaciones. Revisa la consola para más detalles.'
      });
    } finally {
      this.loading = false;
    }
  }

  async deleteUsersGroup(event: any) {
    try {
      const isFromUserDetails  = !!event?.user && Array.isArray(event?.groups_to_delete);
      const isFromGroupDetails = !!event?.grupo && Array.isArray(event?.usuarios_to_delete);

      if (!isFromUserDetails && !isFromGroupDetails) {
        await Swal.fire({
          icon: 'info',
          title: 'Datos insuficientes',
          text: 'No se reconoce el formato del evento recibido.'
        });
        return;
      }

      // Helpers de normalización ya presentes en la clase
      const toNameList = (arr: any[]) =>
        (arr ?? [])
          .map(g => (g?.grupo ?? g?.group ?? '').toString().trim())
          .filter(Boolean);

      let itemIdsToDelete: number[] = [];
      let confirmTitle = '';
      let confirmHtml  = '';
      let postRefresh: () => void = () => {};

      if (isFromUserDetails) {
        // ----- Caso: quitar grupos de un usuario -----
        const userEmail: string = event.user?.email ?? event.user?.username ?? '';
        const groupsToDelete: string[] = toNameList(event.groups_to_delete);

        if (!userEmail || !groupsToDelete.length) {
          await Swal.fire({
            icon: 'info',
            title: 'Nada que eliminar',
            text: 'Faltan el usuario o los grupos a eliminar.'
          });
          return;
        }

        confirmTitle = '¿Quitar usuario de los grupos seleccionados?';
        confirmHtml  = `
          <div class="text-start">
            <p><b>Usuario:</b> <code>${userEmail}</code></p>
            <p><b>Grupos:</b></p>
            <ul style="text-align:left;max-height:180px;overflow:auto;margin:0;">
              ${groupsToDelete.map(g => `<li><code>${g}</code></li>`).join('')}
            </ul>
            <p class="mt-2"><b>Esta acción no se puede deshacer.</b></p>
          </div>
        `;

        const uFull  = this.norm(userEmail);
        const uLocal = this.norm(this.local(userEmail));

        itemIdsToDelete = (this.users_groups ?? [])
          .filter(ug => groupsToDelete.includes((ug?.group ?? ug?.grupo ?? '').toString().trim()))
          .filter(ug => {
            const em = ug?.email ?? ug?.username ?? '';
            const f  = this.norm(em);
            const l  = this.norm(this.local(em));
            return f === uFull || l === uLocal;
          })
          .map(ug => Number(ug?.item_id ?? ug?.id))
          .filter(id => Number.isFinite(id) && id > 0);

        // Tras refrescar, reconstruimos el detalle visible
        postRefresh = () => {
          if (this.visibleUserDetails) {
            this.user_selected = this.buildUserItem(event.user);
          }
        };
      } else {
        // ----- Caso: quitar usuarios de un grupo -----
        const groupName: string = (event?.grupo ?? event?.group ?? '').toString().trim();
        const usersToDelete: string[] = (event?.usuarios_to_delete ?? [])
          .map((u: any) => (u?.email ?? u?.username ?? '').toString().trim())
          .filter(Boolean);

        if (!groupName || !usersToDelete.length) {
          await Swal.fire({
            icon: 'info',
            title: 'Nada que eliminar',
            text: 'Faltan el grupo o los usuarios a eliminar.'
          });
          return;
        }

        confirmTitle = '¿Quitar usuarios del grupo seleccionado?';
        confirmHtml  = `
          <div class="text-start">
            <p><b>Grupo:</b> <code>${groupName}</code></p>
            <p><b>Usuarios:</b></p>
            <ul style="text-align:left;max-height:180px;overflow:auto;margin:0;">
              ${usersToDelete.map(e => `<li><code>${e}</code></li>`).join('')}
            </ul>
            <p class="mt-2"><b>Esta acción no se puede deshacer.</b></p>
          </div>
        `;

        // Set normalizado de posibles claves (full y local) para cada email/username
        const keys = new Set<string>();
        for (const e of usersToDelete) {
          const f = this.norm(e);
          const l = this.norm(this.local(e));
          if (f) keys.add(f);
          if (l) keys.add(l);
        }

        itemIdsToDelete = (this.users_groups ?? [])
          .filter(ug => (ug?.group ?? ug?.grupo ?? '') === groupName)
          .filter(ug => {
            const em = ug?.email ?? ug?.username ?? '';
            const f  = this.norm(em);
            const l  = this.norm(this.local(em));
            return keys.has(f) || keys.has(l);
          })
          .map(ug => Number(ug?.item_id ?? ug?.id))
          .filter(id => Number.isFinite(id) && id > 0);

        // Tras refrescar, reconstruimos el detalle visible
        postRefresh = () => {
          if (this.visibleGroupDetails) {
            this.group_selected = this.buildGroupItem(groupName);
          }
        };
      }

      if (!itemIdsToDelete.length) {
        await Swal.fire({
          icon: 'info',
          title: 'No hay asignaciones coincidentes',
          text: 'No se encontraron documentos en usersgroup que cumplan con los filtros.'
        });
        return;
      }

      // Confirmación
      const res = await Swal.fire({
        icon: 'warning',
        title: confirmTitle,
        html: confirmHtml,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        confirmButtonColor: '#d33'
      });
      if (!res.isConfirmed) return;

      this.loading = true;

      // Borrado en backend (DELETE /usersgroup?id=ITEM_ID)
      const results = await Promise.allSettled(
        itemIdsToDelete.map(id => this.catalogService.delete('usersgroup', id))
      );
      const ok   = results.filter(r => r.status === 'fulfilled').length;
      const fail = results.length - ok;

      // Refrescar y reconstruir detalles si están abiertos
      await this.getUsersGroups();
      postRefresh();

      await Swal.fire({
        icon: fail ? 'warning' : 'success',
        title: fail ? 'Eliminación parcial' : 'Eliminación completada',
        html: `
          <div class="text-start">
            <p><b>Intentos:</b> ${results.length}</p>
            <p><b>Eliminados:</b> ${ok}</p>
            <p><b>Fallidos:</b> ${fail}</p>
          </div>
        `
      });
    } catch (err) {
      console.error('Error en deleteUsersGroup:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema eliminando las asignaciones. Revisa la consola para más detalles.'
      });
    } finally {
      this.visibleUserDetails = false;
      this.loading = false;
    }
  }

  async deleteGroupsUser(event: any) {
    try {
      // Validar forma del evento: { group: ..., users_to_delete: [...] }
      const groupName: string = (
        event?.group?.grupo ??
        event?.group?.group ??
        event?.group ??
        ''
      ).toString().trim();

      const usersToDelete: string[] = (event?.users_to_delete ?? [])
        .map((u: any) => (u?.email ?? u?.username ?? '').toString().trim())
        .filter(Boolean);

      if (!groupName || !usersToDelete.length) {
        await Swal.fire({
          icon: 'info',
          title: 'Nada que eliminar',
          text: 'Faltan el grupo o los usuarios a eliminar.'
        });
        return;
      }

      // Confirmación
      const res = await Swal.fire({
        icon: 'warning',
        title: '¿Quitar usuarios del grupo?',
        html: `
          <div class="text-start">
            <p><b>Grupo:</b> <code>${groupName}</code></p>
            <p><b>Usuarios:</b></p>
            <ul style="text-align:left;max-height:180px;overflow:auto;margin:0;">
              ${usersToDelete.map(e => `<li><code>${e}</code></li>`).join('')}
            </ul>
            <p class="mt-2"><b>Esta acción no se puede deshacer.</b></p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        confirmButtonColor: '#d33'
      });
      if (!res.isConfirmed) return;

      this.loading = true;

      // Normalizar claves para comparar emails/usernames (full y local)
      const keys = new Set<string>();
      for (const e of usersToDelete) {
        const f = this.norm(e);
        const l = this.norm(this.local(e));
        if (f) keys.add(f);
        if (l) keys.add(l);
      }

      // Buscar en memoria los item_id a eliminar en usersgroup
      const itemIdsToDelete: number[] = (this.users_groups ?? [])
        .filter(ug => {
          const g = (ug?.group ?? ug?.grupo ?? '').toString().trim();
          return g === groupName;
        })
        .filter(ug => {
          const em = (ug?.email ?? ug?.username ?? '').toString();
          const f  = this.norm(em);
          const l  = this.norm(this.local(em));
          return keys.has(f) || keys.has(l);
        })
        .map(ug => Number(ug?.item_id ?? ug?.id))
        .filter(id => Number.isFinite(id) && id > 0);

      if (!itemIdsToDelete.length) {
        await Swal.fire({
          icon: 'info',
          title: 'No hay asignaciones coincidentes',
          text: 'No se encontraron documentos en usersgroup que cumplan con los filtros.'
        });
        return;
      }

      // Eliminar en backend (DELETE /usersgroup?id=ITEM_ID)
      const results = await Promise.allSettled(
        itemIdsToDelete.map(id => this.catalogService.delete('usersgroup', id))
      );
      const ok   = results.filter(r => r.status === 'fulfilled').length;
      const fail = results.length - ok;

      // Refrescar y reconstruir detalle si está abierto
      await this.getUsersGroups();
      if (this.visibleGroupDetails) {
        this.group_selected = this.buildGroupItem(groupName);
      }

      // Resumen
      await Swal.fire({
        icon: fail ? 'warning' : 'success',
        title: fail ? 'Eliminación parcial' : 'Eliminación completada',
        html: `
          <div class="text-start">
            <p><b>Intentos:</b> ${results.length}</p>
            <p><b>Eliminados:</b> ${ok}</p>
            <p><b>Fallidos:</b> ${fail}</p>
          </div>
        `
      });
    } catch (err) {
      console.error('Error en deleteGroupsUser:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema eliminando las asignaciones. Revisa la consola para más detalles.'
      });
    } finally {
      this.loading = false;
      this.visibleGroupDetails = false;
    }
  }

  // Usuarios seleccionados para agregar a un grupo
  addUsersToGroup(users: any[]) {
    this.visibleAddUsersToGroup = true;
    this.toAddUsers = users;
  }

  groupsToAddReport(event: any) {
    this.groupsToAdd = event;
  }

  cancelarAddUsersToGroup() {
    this.groupsToAdd = [];
    this.newGroupName = '';
    this.visibleAddUsersToGroup = false;
  }

  async addUsersToGroups() {
    try {
      // 1) Normalizar usuarios (emails)
      const rawUsers: string[] = (this.toAddUsers ?? [])
        .map((u: any) => (u?.email ?? u?.username ?? '').toString().trim())
        .filter(Boolean);

      const users = Array.from(new Set(rawUsers)); // dedupe
      if (!users.length) {
        console.log('[addUsersToGroups] No hay usuarios seleccionados.');
        return;
      }

      // 2) Normalizar grupos (desde groupsToAdd o desde selección en this.groups)
      let groupNames: string[] = Array.isArray(this.groupsToAdd) && this.groupsToAdd.length
        ? this.groupsToAdd.map((g: any) => (g?.grupo ?? g?.group ?? '').toString().trim())
        : (this.groups ?? [])
            .filter((g: any) => !!g?.select)
            .map((g: any) => (g?.grupo ?? g?.group ?? '').toString().trim());

      const newName = (this.newGroupName ?? '').toString().trim();
      if (newName) groupNames.push(newName);

      groupNames = Array.from(new Set(groupNames)).filter(Boolean); // dedupe + limpiar
      if (!groupNames.length) {
        console.log('[addUsersToGroups] No hay grupos seleccionados/ingresados.');
        return;
      }

      // 3) Preparar set de pares existentes (grupo|email) para evitar duplicados
      const key = (g: string, e: string) => `${this.norm(g)}|${this.norm(e)}`;
      const keyLocal = (g: string, e: string) => `${this.norm(g)}|${this.norm(this.local(e))}`;

      const existing = new Set<string>();
      for (const ug of (this.users_groups ?? [])) {
        const g = (ug?.group ?? ug?.grupo ?? '').toString();
        const e = (ug?.email ?? ug?.username ?? '').toString();
        if (!g || !e) continue;
        existing.add(key(g, e));
        existing.add(keyLocal(g, e));
      }

      // 4) Construir payloads a crear { group, email }
      const payloads: Array<{ group: string; email: string }> = [];
      for (const email of users) {
        for (const g of groupNames) {
          if (!existing.has(key(g, email)) && !existing.has(keyLocal(g, email))) {
            payloads.push({ group: g, email });
          }
        }
      }

      if (!payloads.length) {
        console.log('[addUsersToGroups] No hay nuevas asignaciones por crear (todas existen).');
        // Cierro modal igual para UX si quieres
        this.visibleAddUsersToGroup = false;
        return;
      }

      // 5) Crear en backend (POST /usersgroup con body {group,email})
      this.loading = true;
      const results = await Promise.allSettled(
        payloads.map(p => this.catalogService.create('usersgroup', p))
      );
      const ok = results.filter(r => r.status === 'fulfilled').length;
      const fail = results.length - ok;

      // 6) Refrescar datos y limpiar estado de UI
      await this.getUsersGroups();
      this.visibleAddUsersToGroup = false;
      this.toAddUsers = [];
      this.groupsToAdd = [];
      this.newGroupName = '';

      console.log(`[addUsersToGroups] Creación completada. Éxitos: ${ok}, Fallos: ${fail}`);
    } catch (err) {
      console.error('[addUsersToGroups] Error:', err);
    } finally {
      this.loading = false;
    }
  }


}
