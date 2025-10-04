import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersComponent } from '../users/users.component';

export interface GroupItem {
  grupo: string;
  members: Array<{ email: string; item_id: number }>;
}

export type UsersComponentItem = {
  id: number;
  email: string;
  select?: boolean;
  name?: string;
  username?: string;
  item_id?: number;
};

@Component({
  selector: 'app-group-details',
  standalone: true,
  imports: [FormsModule, UsersComponent],
  templateUrl: './group-details.component.html',
  styleUrls: ['./group-details.component.scss'],
})
export class GroupDetailsComponent {
  // ===== estado interno no nulo =====
  private _group: GroupItem = { grupo: '', members: [] };

  // Lista convertida para <app-users>
  usersForChild: UsersComponentItem[] = [];

  // ===== eventos hacia el padre =====
  @Output() deleteUsers = new EventEmitter<UsersComponentItem[]>();

  // ===== input seguro =====
  @Input() set group(value: GroupItem | null | undefined) {
    this._group = value ?? { grupo: '', members: [] };
    this.usersForChild = (this._group.members ?? []).map((m) => {
      const username = (m.email || '').split('@')[0] || m.email;
      return {
        id: Number(m.item_id ?? 0),     // <-- estándar esperado por <app-users>
        email: m.email,
        item_id: m.item_id,
        select: false,
        name: m.email,                  // opcional
        username,                       // opcional
      };
    });
  }
  get group(): GroupItem {
    return this._group;
  }

  // ===== reenvío de eventos desde <app-users> =====
  onDeleteUsers(event: any[]) {
    let data: any = {group: this.group, users_to_delete: event};
    this.deleteUsers.emit(data);
  }
}
