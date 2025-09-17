import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import {
  ButtonDirective,
  ButtonCloseDirective,
  ButtonGroupComponent,
  ButtonToolbarComponent,
  ThemeDirective
} from '@coreui/angular';

export interface AgendaItem {
  item_id: number;
  message_id: number;
  group: string;
  scheduleISO: string;      // schedule.$date en ISO
  timestampISO?: string;    // timestamp.$date en ISO
}

type AgendaItemView = AgendaItem & {
  date: Date;
  title?: string;
  color?: string;
  startTime?: string;
  endTime?: string;
};

type CalendarView = 'month' | 'week' | 'day';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    ButtonDirective,
    ButtonCloseDirective,
    ButtonGroupComponent,
    ButtonToolbarComponent,
    ThemeDirective
  ],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss']
})
export class ScheduleComponent implements OnChanges {
  // === Inputs ===
  @Input('appointments') appointmentsInput: AgendaItem[] = [];
  @Input('messages') messages: any[] = [];
  @Input('view') currentView: CalendarView = 'month';
  @Input('dropable') dropable: boolean = true;
  @Input('editable') editable: boolean = true;
  @Input('show_toolbar') show_toolbar: boolean = true;

  // === Outputs ===
  @Output('select_date') select_date = new EventEmitter<AgendaItem>();
  @Output('delete_appointment') delete_appointment = new EventEmitter<AgendaItem>();

  // === Estado de UI ===
  viewDate: Date = new Date();
  weekDays: string[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  weeks: Date[][] = [];
  monthDays: Date[] = [];
  timeSlots: string[] = [];

  // Seleccionado
  selectedAppointment: AgendaItem | null = null;

  // Colección para el template (con date/title/color)
  appointments: any[] = [];

  constructor() {
    this.generateTimeSlots();
    this.generateMonthMatrix(this.viewDate);
    this.generateWeekArrays(this.viewDate);
    this.refreshViewAppointments();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appointmentsInput']) {
      this.refreshViewAppointments();
    }
    if (changes['view']) {
      this.switchToView(this.currentView);
    }
  }

  private refreshViewAppointments() {
    this.appointments = (this.appointmentsInput || []).map(a => ({
      ...a,
      date: new Date(a.scheduleISO),
      title: (a as any).title ?? (a.group || 'Cita'),
      color: (a as any).color
    })) as AgendaItemView[];
  }

  // ====== Utilidades de fecha ======
  private startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0,0,0,0); return x; }
  private endOfDay(d: Date): Date { const x = new Date(d); x.setHours(23,59,59,999); return x; }

  isToday(date: Date): boolean {
    const n = new Date();
    return date.getFullYear() === n.getFullYear()
        && date.getMonth() === n.getMonth()
        && date.getDate() === n.getDate();
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.viewDate.getMonth() && date.getFullYear() === this.viewDate.getFullYear();
  }

  isSameDate(a: any, b: Date): boolean {
    if (!a) return false;
    const d = (a instanceof Date) ? a : new Date(a);
    return d.getFullYear() === b.getFullYear()
        && d.getMonth() === b.getMonth()
        && d.getDate() === b.getDate();
  }

  // Para resaltar seleccionado
  isSelected(appt: any): boolean {
    if (!this.selectedAppointment) return false;
    return (
      (appt?.item_id === this.selectedAppointment.item_id && appt?.item_id !== 0) ||
      (appt?.scheduleISO === this.selectedAppointment.scheduleISO)
    );
  }

  // ====== Construcción de vistas ======
  private generateMonthMatrix(base: Date) {
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const start = new Date(first);
    const offset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - offset);

    const weeks: Date[][] = [];
    for (let w = 0; w < 6; w++) {
      const row: Date[] = [];
      for (let d = 0; d < 7; d++) {
        const cell = new Date(start);
        cell.setDate(start.getDate() + (w * 7 + d));
        row.push(cell);
      }
      weeks.push(row);
    }
    this.weeks = weeks;
  }

  private generateWeekArrays(base: Date) {
    const start = new Date(base);
    const offset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - offset);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    this.monthDays = days;
  }

  private generateTimeSlots() {
    const slots: string[] = [];
    for (let h = 0; h < 24; h++) {
      const hh = h.toString().padStart(2, '0');
      slots.push(`${hh}:00`);
    }
    this.timeSlots = slots;
  }

  switchToView(view: CalendarView) {
    this.currentView = view;
    if (view === 'month') this.generateMonthMatrix(this.viewDate);
    if (view === 'week' || view === 'day') this.generateWeekArrays(this.viewDate);
  }

  previous() {
    const d = new Date(this.viewDate);
    if (this.currentView === 'month') d.setMonth(d.getMonth() - 1);
    if (this.currentView === 'week')  d.setDate(d.getDate() - 7);
    if (this.currentView === 'day')   d.setDate(d.getDate() - 1);
    this.viewDate = d;
    this.switchToView(this.currentView);
  }

  next() {
    const d = new Date(this.viewDate);
    if (this.currentView === 'month') d.setMonth(d.getMonth() + 1);
    if (this.currentView === 'week')  d.setDate(d.getDate() + 7);
    if (this.currentView === 'day')   d.setDate(d.getDate() + 1);
    this.viewDate = d;
    this.switchToView(this.currentView);
  }

  viewToday() {
    this.viewDate = new Date();
    this.switchToView(this.currentView);
  }

  // ====== Filtros usados en Week/Day ======
  getAppointmentsForDateTime(day: Date, timeSlot: string): any[] {
    const targetHour = parseInt(timeSlot.split(':')[0], 10);
    const start = this.startOfDay(day).getTime();
    const end = this.endOfDay(day).getTime();
    return (this.appointments as AgendaItemView[]).filter(a => {
      const t = a.date.getTime();
      if (t < start || t > end) return false;
      return a.date.getHours() === targetHour;
    });
  }

  // ====== Drag & Drop ======
  drop(event: CdkDragDrop<any>, date: Date, timeSlot?: string) {
    if (!this.dropable || !this.editable) return;
    const item = event.item.data as AgendaItemView;
    const d = new Date(date);
    if (timeSlot) {
      const [hh, mm] = timeSlot.split(':').map(n => parseInt(n, 10));
      d.setHours(hh, mm, 0, 0);
    } else {
      d.setSeconds(0, 0);
    }
    item.scheduleISO = d.toISOString();
    item.date = new Date(item.scheduleISO);
  }

  // ====== Selección ======
  selectDate(date: Date, timeSlot?: string) {
    const d = new Date(date);
    if (timeSlot) {
      const [hh, mm] = timeSlot.split(':').map(v => parseInt(v, 10));
      d.setHours(hh, mm, 0, 0);
    } else {
      d.setSeconds(0, 0);
    }

    const blank: AgendaItem = {
      item_id: 0,
      message_id: 0,
      group: '',
      scheduleISO: d.toISOString(),
      timestampISO: undefined
    };

    this.selectedAppointment = blank;
    this.select_date.emit(this.selectedAppointment);
  }

  onAppointmentClick(appointment: AgendaItemView, ev?: MouseEvent) {
    ev?.stopPropagation();
    const chosen: AgendaItem = {
      item_id: appointment.item_id,
      message_id: appointment.message_id,
      group: appointment.group,
      scheduleISO: appointment.scheduleISO,
      timestampISO: appointment.timestampISO
    };
    this.selectedAppointment = chosen;
    this.select_date.emit(this.selectedAppointment);
  }

  // ====== Eliminar (solo notifica al padre) ======
  onDeleteClick(appointment: AgendaItemView, ev?: MouseEvent) {
    ev?.stopPropagation();
    const toDelete: AgendaItem = {
      item_id: appointment.item_id,
      message_id: appointment.message_id,
      group: appointment.group,
      scheduleISO: appointment.scheduleISO,
      timestampISO: appointment.timestampISO
    };
    this.delete_appointment.emit(toDelete);
  }

  // ====== Hint / Tooltip nativo ======
  getAppointmentHint(appointment: any): string {
    const d = new Date(appointment.scheduleISO);
    const fecha = d.toLocaleDateString('es-EC');
    const hora  = d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

    // buscar el mensaje correspondiente
    const msg = this.messages.find(m => m.item_id === appointment.message_id);
    const description = msg ? msg.description : `Mensaje ${appointment.message_id}`;

    return `Grupo: ${appointment.group || '-'} | ${description} | ${fecha} ${hora}`;
  }
}
