import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Message } from '../../../models/message.model';

@Component({
  selector: 'app-base-message',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './base-message.component.html',
  styleUrls: ['./base-message.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BaseMessageComponent {
  // Inputs
  @Input() model!: Message;                 // el padre pasa una copia editable
  @Input() messages: Message[] = [];
  @Input() item_id_selected = 0;            // 0 = nuevo

  // Outputs
  @Output() modelChange = new EventEmitter<Message>();
  @Output() tipoCambiado = new EventEmitter<string>();
  @Output() item_idCambiado = new EventEmitter<number>();

  // ========== Handlers de UI ==========
  /** Cambio en el selector de mensajes */
  onItemIdChange(value: number | string) {
    const id = Number(value) || 0;
    this.item_idCambiado.emit(id);
  }

  /** Cambio de tipo */
  onTipoChange(nuevoTipo: string) {
    this.tipoCambiado.emit(nuevoTipo);

    // Emitimos también el nuevo modelo para sincronizar con el padre
    const next: Message = { ...this.model, type: nuevoTipo };

    if (nuevoTipo === 'Texto') {
      // content debe ser { title, text }
      if (typeof next.content !== 'object' || next.content === null || !('title' in next.content) || !('text' in next.content)) {
        next.content = { title: '', text: '' } as any;
      }
      next.width = undefined;
    } else if (nuevoTipo === 'Imagen') {
      // content debe ser { image: base64 }
      if (typeof next.content !== 'object' || next.content === null || !('image' in next.content)) {
        next.content = { image: '' } as any;
      }
    }

    this.modelChange.emit(next);
  }

  /** Cambio de duración */
  onDuracionChange(value: number | string) {
    const dur = Math.max(0, Number(value) || 0);
    if (dur !== this.model.duration) {
      this.modelChange.emit({ ...this.model, duration: dur });
    } else {
      this.modelChange.emit({ ...this.model });
    }
  }

  /** Cambio de link */
  onLinkChange(link: string) {
    const val = (link ?? '').trim();
    if (val !== this.model.link) {
      this.modelChange.emit({ ...this.model, link: val });
    } else {
      this.modelChange.emit({ ...this.model });
    }
  }

  // ========== Utilidades ==========
  esLinkValido(link?: string): boolean {
    if (!link) return false;
    try {
      const url = new URL(link);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  abrirLink() {
    if (this.esLinkValido(this.model?.link)) {
      window.open(this.model.link, '_blank', 'noopener,noreferrer');
    }
  }

  trackByItemId = (_: number, m: Message) => m.item_id ?? -1;
}
