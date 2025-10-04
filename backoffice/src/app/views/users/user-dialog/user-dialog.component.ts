import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BackofficeService, BackofficeUser } from '../../../services/backoffice.service';

@Component({
  selector: 'app-user-dialog',
  imports: [FormsModule],
  templateUrl: './user-dialog.component.html',
  styleUrl: './user-dialog.component.scss'
})
export class UserDialogComponent {
  @Input() user: any = {
    id: 0,
    username: ''
  };
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<string>();

  password: string = '';
  confirm_password: string = '';

  loading = false;
  saving = false;

  constructor(private backoffice: BackofficeService) {}

  cancelButton() {
    this.cancel.emit('cancel');
    this.password = '';
    this.confirm_password = '';
  }

  saveButton() {
    let data: any = {
      id: 0,
      username: '',
      password: ''
    };
    if(this.password == this.confirm_password) {
      data.id = this.user.id ?? 0;
      data.username = this.user.username;
      data.password = this.password;
      this.save.emit(data);
    }
  }
}
