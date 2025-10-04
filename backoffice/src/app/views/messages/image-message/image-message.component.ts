import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Message } from '../../../models/message.model';

@Component({
  selector: 'app-image-message',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-message.component.html',
  styleUrls: ['./image-message.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageMessageComponent implements OnChanges {
  @Input() model!: Message;
  @Output() modelChange = new EventEmitter<Message>();

  // Preview (data URL completa) para el <img>
  imagenCargada: string | null = null;
  dragging = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('model' in changes && this.model) {
      // Si ya existe contenido con image base64, arma la data URL para previsualizar
      const base64 = this.leerBase64Actual();
      this.imagenCargada = base64 ? this.toDataUrl(base64) : null;
    }
  }

  // ====== width ======
  emitirAncho(event: Event | number | string) {
    // Soporta (input) del HTML y asignación directa
    let val: number;
    if (typeof event === 'number' || typeof event === 'string') {
      val = Number(event) || 0;
    } else {
      const target = event.target as HTMLInputElement;
      val = Number(target?.value) || 0;
    }
    this.modelChange.emit({ ...this.model, width: val });
  }

  // ====== drag & drop ======
  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragging = true;
  }
  onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
  }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.cargarArchivo(file);
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.cargarArchivo(file);
  }

  private cargarArchivo(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // dataUrl tiene "data:image/png;base64,AAAA..."
      const base64 = this.extractBase64(dataUrl);

      // Garantiza el shape { content: { image: base64 } }
      const content = { ...(typeof this.model.content === 'object' ? this.model.content : {}), image: base64 };
      const next: Message = { ...this.model, content };

      this.imagenCargada = this.toDataUrl(base64);
      this.modelChange.emit(next);
    };
    reader.readAsDataURL(file);
  }

  // ====== helpers ======
  private extractBase64(dataUrl: string): string {
    const comma = dataUrl.indexOf(',');
    return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  }

  private toDataUrl(base64: string, mime = 'image/png'): string {
    // Puedes intentar detectar mime del dataUrl original si lo necesitas
    return `data:${mime};base64,${base64}`;
  }

  private leerBase64Actual(): string | null {
    if (this.model?.content && typeof this.model.content === 'object' && 'image' in this.model.content) {
      const v: unknown = (this.model.content as any).image;
      if (typeof v === 'string' && v.length > 0) return v;
    }
    return null;
    }
}
