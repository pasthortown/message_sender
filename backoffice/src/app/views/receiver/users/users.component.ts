import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';

export interface UserItem {
  id?: number;            // usado por el trackBy del @for
  item_id?: number;
  email: string;
  select?: boolean;
  sin_grupo?: boolean;    // calculado
  groups?: string[];      // opcional: si viene, ayuda a calcular sin_grupo
  username?: string;      // respaldo para email si no viniera
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit, OnChanges {

  @Input() title: string = 'Administración de Usuarios';
  @Input() show_details: boolean = true;
  @Input() can_delete: boolean = false;
  @Input() users: any[] = [];              // fuente externa

  @Output() deleteSelected = new EventEmitter<UserItem[]>();
  @Output() addSelectedToGroup = new EventEmitter<UserItem[]>();
  @Output() showDetails = new EventEmitter<UserItem>();

  users_all: UserItem[] = [];              // normalizados
  users_visible: UserItem[] = [];          // filtrados + ordenados
  private searchTerm: string = '';

  ngOnInit(): void {
    this.rebuild();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('users' in changes) {
      this.rebuild();
    }
  }

  // ---------- UI actions ----------
  onToggleSelect(user: UserItem): void {
    user.select = !user.select;
    this.sortVisible();
  }

  inspectUser(user: UserItem): void {
    this.showDetails.emit(user);
  }

  emitDeleteSelected(): void {
    const selected = this.users_visible.filter(u => u.select);
    this.deleteSelected.emit(selected);
  }

  emitAddSelectedToGroup(): void {
    const selected = this.users_visible.filter(u => u.select);
    this.addSelectedToGroup.emit(selected);
  }

  filterUsers(q: string): void {
    this.searchTerm = (q ?? '').toString().trim().toLowerCase();
    this.applyFilter();
  }

  // ---------- Core ----------
  private rebuild(): void {
    // normalizar
    this.users_all = (this.users ?? []).map((u: any, idx: number) => this.normalizeUser(u, idx));
    // aplicar búsqueda y orden
    this.applyFilter();
  }

  private applyFilter(): void {
    const q = this.searchTerm;
    const base = !q
      ? this.users_all.slice()
      : this.users_all.filter(u => (u.email ?? '').toLowerCase().includes(q));
    this.users_visible = base;
    this.sortVisible();
  }

  /** Prioridad: seleccionados (0) -> sin_grupo (1) -> asignados (2) */
  private priority(u: UserItem): number {
    if (u.select) return 0;
    if (u.sin_grupo) return 1;
    return 2;
  }

  private sortVisible(): void {
    this.users_visible.sort((a, b) => {
      const pa = this.priority(a);
      const pb = this.priority(b);
      if (pa !== pb) return pa - pb;
      const ea = (a.email ?? '').toString();
      const eb = (b.email ?? '').toString();
      return ea.localeCompare(eb, undefined, { sensitivity: 'base' });
    });
  }

  private normalizeUser(raw: any, idx: number): UserItem {
    const email = (raw?.email ?? raw?.username ?? '').toString();
    const idNum = Number(raw?.item_id ?? raw?.id);
    const id = Number.isFinite(idNum) && idNum > 0 ? idNum : idx + 1;

    // resolver sin_grupo:
    let sin_grupo: boolean;
    if (typeof raw?.sin_grupo === 'boolean') {
      sin_grupo = raw.sin_grupo;
    } else if (Array.isArray(raw?.groups)) {
      sin_grupo = raw.groups.length === 0;
    } else {
      // si no hay info, asumimos "asignado" (false) para no priorizar indebidamente
      sin_grupo = false;
    }

    return {
      id,
      item_id: idNum || id,
      email,
      select: !!raw?.select,
      sin_grupo,
      groups: Array.isArray(raw?.groups) ? raw.groups : undefined,
      username: raw?.username
    };
  }
}
