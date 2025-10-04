import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import {
  NgbDatepickerModule,
  NgbTimepickerModule,
  NgbDateStruct,
  NgbTimeStruct
} from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

export interface NewEventPayload {
  messageKey: number | null;
  groups: string[];
  date: NgbDateStruct | null;
  time: NgbTimeStruct | null;
  scheduledAtISO?: string | null;
}

type MessageItem = { item_id: number; description: string; [k: string]: any };
type GroupItem   = { item_id: number; group: string;      [k: string]: any };

@Component({
  selector: 'app-new-event',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, NgbDatepickerModule, NgbTimepickerModule],
  templateUrl: './new-event.component.html',
  styleUrls: ['./new-event.component.scss']
})
export class NewEventComponent {
  @Input() messages: MessageItem[] = [];
  @Input() groupsOptions: GroupItem[] = [];

  @Output() createEvent = new EventEmitter<NewEventPayload>();

  messageKey: number | null = null;
  groups: string[] = [];
  dateModel: NgbDateStruct | null = null;
  timeModel: NgbTimeStruct | null = { hour: 9, minute: 0, second: 0 };

  private toDate(date: NgbDateStruct | null, time: NgbTimeStruct | null): Date | null {
    if (!date || !time) return null;
    return new Date(
      date.year,
      date.month - 1,
      date.day,
      time.hour ?? 0,
      time.minute ?? 0,
      time.second ?? 0,
      0
    );
  }

  private toISO(date: NgbDateStruct | null, time: NgbTimeStruct | null): string | null {
    const d = this.toDate(date, time);
    return d ? d.toISOString() : null;
  }

  async emitEvent(): Promise<void> {
    // --- Validaciones ---
    if (this.messageKey == null) {
      await Swal.fire({ icon: 'warning', title: 'Seleccione un mensaje', confirmButtonText: 'Entendido' });
      return;
    }

    if (!this.groups || this.groups.length === 0) {
      await Swal.fire({ icon: 'warning', title: 'Seleccione al menos un grupo', confirmButtonText: 'Entendido' });
      return;
    }

    if (!this.dateModel || !this.timeModel) {
      await Swal.fire({ icon: 'warning', title: 'Seleccione fecha y hora', confirmButtonText: 'Entendido' });
      return;
    }

    const when = this.toDate(this.dateModel, this.timeModel);
    if (!when) {
      await Swal.fire({ icon: 'warning', title: 'Fecha u hora inválida', confirmButtonText: 'Entendido' });
      return;
    }

    if (when.getTime() < Date.now()) {
      await Swal.fire({ icon: 'error', title: 'La fecha/hora es menor a la actual', confirmButtonText: 'Corregir' });
      return;
    }

    // --- Confirmación ---
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Confirmar agendamiento?',
      text: 'Se programará el envío con los datos seleccionados.',
      showCancelButton: true,
      confirmButtonText: 'Sí, agendar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!isConfirmed) return;

    // --- Emitir sin más mensajes (el padre manejará el resto) ---
    const payload: NewEventPayload = {
      messageKey: this.messageKey,
      groups: this.groups ?? [],
      date: this.dateModel,
      time: this.timeModel,
      scheduledAtISO: this.toISO(this.dateModel, this.timeModel)
    };
    this.createEvent.emit(payload);
  }

  reset(): void {
    this.messageKey = null;
    this.groups = [];
    this.dateModel = null;
    this.timeModel = { hour: 9, minute: 0, second: 0 };
  }
}
