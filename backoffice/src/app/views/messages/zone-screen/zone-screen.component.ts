import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Message } from '../../../models/message.model';

@Component({
  selector: 'app-zone-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zone-screen.component.html',
  styleUrl: './zone-screen.component.scss'
})
export class ZoneScreenComponent {
  @Input() model!: Message;
  @Output() modelChange = new EventEmitter<Message>();

  hovered: number | null = null;

  matriz: number[][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8]
  ];

  get seleccion(): number | null {
    return this.model?.zone ?? null;
  }

  seleccionar(celda: number) {
    this.model.zone = celda;
    this.modelChange.emit(this.model);
  }
}
