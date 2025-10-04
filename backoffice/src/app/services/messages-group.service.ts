// messages-group.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from './../../environments/environment';

export interface ApiEnvelope<T> {
  response: T;
  status: number;
}

/** Documento típico de "messagesgroup".
 *  Nota: el WS serializa fechas con json_util de Mongo, que puede venir como:
 *  { schedule: { $date: '2025-08-27T10:00:00.000Z' } }.
 */
export type MessagesGroupDoc = {
  group?: string;
  schedule?: string | { $date: string };
  [k: string]: any;
};

@Injectable({ providedIn: 'root' })
export class MessagesGroupService {
  private http = inject(HttpClient);
  private base = environment.url_ws.replace(/\/+$/, '');

  /** Headers con Authorization si hay token almacenado */
  private headers(): HttpHeaders {
    const token = environment.token; // ajusta la clave si usas otra
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  /** GET /search/messagesgroup/:group_name
   *  Devuelve los mensajes DEL DÍA (rango UTC) para ese grupo.
   */
  getTodayByGroup$(
    groupName: string
  ): Observable<ApiEnvelope<MessagesGroupDoc[]>> {
    const url = `${this.base}/search/messagesgroup/${encodeURIComponent(groupName)}`;
    return this.http.get<ApiEnvelope<MessagesGroupDoc[]>>(url, { headers: this.headers() });
  }

  /** Versión async/await (helper opcional) */
  async getTodayByGroup(
    groupName: string
  ): Promise<ApiEnvelope<MessagesGroupDoc[]>> {
    return firstValueFrom(this.getTodayByGroup$(groupName));
  }

  // ---------- Utilidad opcional para normalizar la fecha ----------
  /** Convierte schedule de { $date: string } a string ISO plano (no muta el original). */
  normalizeSchedule<T extends MessagesGroupDoc>(doc: T): T & { schedule?: string } {
    const schedule = (doc as any)?.schedule;
    if (schedule && typeof schedule === 'object' && '$date' in schedule) {
      return { ...doc, schedule: schedule.$date };
    }
    return doc as T & { schedule?: string };
  }
}
