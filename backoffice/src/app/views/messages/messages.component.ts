import { CatalogService } from './../../services/catalog.service';
import { Component, OnInit } from '@angular/core';
import { IconDirective } from '@coreui/icons-angular';
import {
  ButtonDirective,
  ColComponent,
  ContainerComponent,
  FormControlDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';
import { BaseMessageComponent } from './base-message/base-message.component';
import { ImageMessageComponent } from './image-message/image-message.component';
import { TextMessageComponent } from './text-message/text-message.component';
import { ZoneScreenComponent } from './zone-screen/zone-screen.component';
import { Message } from '../../models/message.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
  imports: [
    ContainerComponent,
    RowComponent,
    ColComponent,
    InputGroupComponent,
    InputGroupTextDirective,
    IconDirective,
    FormControlDirective,
    ButtonDirective,
    BaseMessageComponent,
    ImageMessageComponent,
    TextMessageComponent,
    ZoneScreenComponent
  ]
})
export class MessagesComponent implements OnInit {
  constructor(private catalogService: CatalogService) {}

  loading = false;
  saving = false;

  messages: Message[] = [];
  item_id_selected = 0;

  message: Message = this.newEmptyMessage();

  ngOnInit(): void {
    this.getMessages();
  }

  // ================== Helpers ==================
  private newEmptyMessage(): Message {
    return {
      item_id: 0,
      description: '',
      type: 'image',                 // ahora trabajamos siempre con 'image' | 'text'
      content: { image: '' },        // para imagen: { image: base64 }
      duration: 10,
      link: 'https://ec.linkedin.com/company/gurpo-kfc-ecuador',
      zone: 9,
      width: 300
    };
  }

  private deepClone<T>(v: T): T {
    return JSON.parse(JSON.stringify(v));
  }

  private toBackendPayload(m: Message) {
    // normaliza content según el tipo actual (image | text)
    let content: any;
    if (m.type === 'image') {
      const base64 =
        m?.content && typeof m.content === 'object' && 'image' in (m.content as any)
          ? (m.content as any).image ?? ''
          : typeof m.content === 'string'
          ? m.content
          : '';
      content = { image: base64 };
    } else {
      // text
      if (m?.content && typeof m.content === 'object' && 'title' in (m.content as any) && 'text' in (m.content as any)) {
        content = {
          title: (m.content as any).title ?? '',
          text: (m.content as any).text ?? ''
        };
      } else {
        content = { title: '', text: typeof m.content === 'string' ? m.content : '' };
      }
    }

    const payload: any = {
      ...(m.item_id && m.item_id > 0 ? { item_id: m.item_id } : {}),
      description: (m.description ?? '').trim(),
      type: m.type, // ya viene 'image' | 'text' desde el HTML
      content,
      duration: Number(m.duration) || 0,
      link: (m.link ?? '').trim(),
      zone: m.zone,
      width: m.width
    };

    return payload;
  }

  private stripItemId<T extends { item_id?: number }>(obj: T): Omit<T, 'item_id'> {
    const { item_id, ...rest } = obj;
    return rest;
  }

  trackByItemId = (_: number, m: Message) => m.item_id ?? -1;

  async delete_message(message: Message) {
    if (!message?.item_id || message.item_id <= 0) {
      await Swal.fire({
        icon: 'info',
        title: 'Nada que eliminar',
        text: 'El mensaje aún no tiene un item_id válido.'
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Eliminar mensaje?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'No, cancelar'
    });

    if (!result.isConfirmed) return;

    if (this.saving) return;
    this.saving = true;

    try {
      // 🔧 pasa solo el número, no un objeto
      await this.catalogService.delete('messages', message.item_id);

      if (this.item_id_selected === message.item_id) {
        this.item_id_selected = 0;
        this.message = this.newEmptyMessage();
      }

      await this.getMessages();

      await Swal.fire({
        icon: 'success',
        title: 'Mensaje eliminado',
        text: 'Se eliminó correctamente.'
      });
    } catch (err: any) {
      console.error('Error eliminando Message:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message ?? 'Ocurrió un error al eliminar el mensaje.'
      });
    } finally {
      this.saving = false;
    }
  }

  // ================== Cargar catálogo ==================
  async getMessages() {
    this.loading = true;
    try {
      const { response } = await this.catalogService.list<Message>('messages');

      this.messages = response ?? [];

      // resincroniza el model si hay uno seleccionado
      if (this.item_id_selected > 0) {
        const found = this.messages.find(m => m.item_id === this.item_id_selected);
        this.message = found ? this.deepClone(found) : this.newEmptyMessage();
        if (!found) this.item_id_selected = 0;
      }
    } catch (err) {
      console.error('Error cargando Messages:', err);
      this.messages = [];
      this.item_id_selected = 0;
      this.message = this.newEmptyMessage();
    } finally {
      this.loading = false;
    }
  }

  // ================== Eventos UI / Hijo ==================
  onModelChange(m: Message) {
    this.message = this.deepClone(m);
  }

  onTipoCambiado(nuevoTipo: string) {
    // admitimos 'image'/'text' (minúsculas)
    const t = (nuevoTipo ?? '').toLowerCase();
    this.message.type = t as any;

    if (t === 'text') {
      this.message.content =
        typeof this.message.content === 'object' &&
        this.message.content !== null &&
        'title' in (this.message.content as any) &&
        'text' in (this.message.content as any)
          ? this.message.content
          : ({ title: '', text: '' } as any);
      this.message.width = undefined;
    } else if (t === 'image') {
      this.message.content =
        typeof this.message.content === 'object' &&
        this.message.content !== null &&
        'image' in (this.message.content as any)
          ? this.message.content
          : ({ image: '' } as any);
    }
  }

  onCambioItemId(id: number) {
    if (!id || id === 0) {
      this.item_id_selected = 0;
      this.message = this.newEmptyMessage();
      return;
    }
    const found = this.messages.find(m => m.item_id === id);
    this.item_id_selected = id;
    this.message = found ? this.deepClone(found) : this.newEmptyMessage();
    if (found?.item_id) this.message.item_id = found.item_id;
  }

  cancel() {
    this.item_id_selected = 0;
    this.message = this.newEmptyMessage();
  }

  // ================== Guardar ==================
  async saveMessage() {
    if (this.saving) return;

    const isUpdate = !!(this.message.item_id && this.message.item_id > 0);
    const confirmTitle = isUpdate
      ? '¿Está seguro de actualizar los datos?'
      : '¿Está seguro de guardar los datos?';

    const confirmBtn = isUpdate ? 'Sí, actualizar' : 'Sí, guardar';

    const result = await Swal.fire({
      title: confirmTitle,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmBtn,
      cancelButtonText: 'No, cancelar'
    });

    if (!result.isConfirmed) return;

    this.saving = true;
    try {
      const payload = this.toBackendPayload(this.message);

      if (isUpdate) {
        await this.catalogService.update('messages', payload);
      } else {
        const { response } = await this.catalogService.create<any>('messages', this.stripItemId(payload));
        if (response?.item_id) this.item_id_selected = response.item_id;
      }

      await this.getMessages();

      // Reposicionar el model tras guardar
      if (this.item_id_selected > 0) {
        const after = this.messages.find(m => m.item_id === this.item_id_selected);
        this.message = after ? this.deepClone(after) : this.newEmptyMessage();
      } else if (isUpdate && this.message.item_id) {
        const after = this.messages.find(m => m.item_id === this.message.item_id);
        if (after) {
          this.item_id_selected = after.item_id!;
          this.message = this.deepClone(after);
        } else {
          this.message = this.newEmptyMessage();
        }
      } else {
        this.message = this.newEmptyMessage();
      }

      await Swal.fire({
        icon: 'success',
        title: isUpdate ? 'Mensaje actualizado' : 'Mensaje guardado',
        text: 'La operación se realizó correctamente.'
      });
    } catch (err: any) {
      console.error('Error guardando Message:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message ?? 'Ocurrió un error al guardar el mensaje.'
      });
    } finally {
      this.saving = false;
    }
  }
}
