import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Message, TextoContent } from '../../../models/message.model';

@Component({
  selector: 'app-text-message',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './text-message.component.html',
  styleUrl: './text-message.component.scss'
})
export class TextMessageComponent {
  @Input() model!: Message;
  @Output() modelChange = new EventEmitter<Message>();

  emitirCambio() {
    this.modelChange.emit(this.model);
  }

  get textoModel(): TextoContent {
    if (typeof this.model.content === 'object' && this.model.content !== null) {
      return this.model.content as TextoContent;
    }
    return { title: '', text: '' };
  }
}
