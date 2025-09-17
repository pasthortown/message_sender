import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-users-list',
  imports: [],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss'
})
export class UsersListComponent {

  @Input() users: any[] = [];
  @Output() userSelected = new EventEmitter<any>();

  selectUser(user: any): void {
    this.userSelected.emit(user);
  }
}
