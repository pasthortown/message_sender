import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

export interface GroupItem {
  grupo: string;
  select?: boolean;
}

@Component({
  selector: 'app-groups',
  standalone: true,
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.scss'],
  imports: [], // agrega los imports que ya usabas si este componente es standalone
})
export class GroupsComponent implements OnChanges {
  @Input() groups: GroupItem[] = [];
  @Input() show_details = false;
  @Input() can_delete = true;
  @Input() title = 'Administración de Grupos';

  @Output() deleteGroups = new EventEmitter<GroupItem[]>();
  @Output() showDetails = new EventEmitter<GroupItem>();
  @Output() goupsSelected = new EventEmitter<GroupItem[]>(); // (mantengo tu nombre actual)

  /** Arreglo maestro con todos los grupos (fuente de la verdad) */
  private groups_all: GroupItem[] = [];

  /** Arreglo visible (resultado del filtrado + ordenado) */
  groups_visible: GroupItem[] = [];

  /** Último término de búsqueda aplicado (para re-filtrar ante cambios de @Input) */
  private searchTerm = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['groups']) {
      // Clonamos para evitar alterar la referencia externa
      this.groups_all = Array.isArray(this.groups) ? [...this.groups] : [];
      // Reaplica el filtro y el orden
      this.filterGroups(this.searchTerm);
    }
  }

  // ----------------- Filtro + Orden -----------------

  filterGroups(term?: string): void {
    // Actualiza y normaliza el término
    this.searchTerm = (term ?? this.searchTerm ?? '').trim();

    const needle = this.normalize(this.searchTerm);
    if (!needle) {
      this.groups_visible = [...this.groups_all];
      this.sortVisible();
      return;
    }

    this.groups_visible = this.groups_all.filter((g) =>
      this.normalize(g?.grupo).includes(needle)
    );
    this.sortVisible();
  }

  /** Prioridad: seleccionados (0) -> no seleccionados (1) */
  private priority(g: GroupItem): number {
    return g.select ? 0 : 1;
  }

  private sortVisible(): void {
    this.groups_visible.sort((a, b) => {
      const pa = this.priority(a);
      const pb = this.priority(b);
      if (pa !== pb) return pa - pb;

      const ga = (a.grupo ?? '').toString();
      const gb = (b.grupo ?? '').toString();
      // Comparación alfabética A→Z ignorando acentos y mayúsculas
      return this.normalize(ga).localeCompare(this.normalize(gb), undefined, { sensitivity: 'base' });
    });
  }

  /** Normaliza texto para comparación: minúsculas y sin acentos/diacríticos */
  private normalize(v: string | undefined | null): string {
    return (v ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, ''); // requiere flag 'u'
  }

  // ----------------- Acciones UI -----------------

  onToggleSelect(group: GroupItem): void {
    group.select = !group.select;
    this.sortVisible();           // reordenar tras cambiar selección
    this.reportSelectedGroups();  // informar selección
  }

  reportSelectedGroups(): void {
    this.goupsSelected.emit(this.groups_all.filter(g => g.select));
  }

  deleteGroupsSelected(): void {
    this.deleteGroups.emit(this.groups_all.filter(g => g.select));
  }

  inspectGroup(group: GroupItem): void {
    this.showDetails.emit(group);
  }
}
