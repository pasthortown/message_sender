import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GroupsComponent } from '../groups/groups.component';

export interface UserItem {
  item_id?: number;
  email: string;
  groups: string[];
}

export type GroupsComponentItem = {
  grupo: string;
  select?: boolean;
};

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [FormsModule, GroupsComponent],
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss'],
})
export class UserDetailsComponent {
  // Estado interno no nulo
  private _user: UserItem = { email: '', groups: [] };

  // Lista adaptada para <app-groups>
  groupsForChild: GroupsComponentItem[] = [];

  // ==== Inputs / Outputs ====
  @Input() set user(value: UserItem | null | undefined) {
    this._user = value ?? { email: '', groups: [] };
    this.groupsForChild = (this._user.groups ?? []).map((g) => ({
      grupo: g,
      select: false,
    }));
  }
  get user(): UserItem {
    return this._user;
  }

  /** Reenvío de eventos desde <app-groups> hacia el padre (Receiver) */
  @Output() deleteGroups = new EventEmitter<any>();

  onDeleteGroups(groups: GroupsComponentItem[]) {
    let data: any = {user: this.user, groups_to_delete: groups};
    this.deleteGroups.emit(data);
  }

}
