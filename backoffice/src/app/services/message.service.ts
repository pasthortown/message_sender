// message.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from './../../environments/environment';

export interface ApiEnvelope<T> {
  response: T;
  status: number;
}

/** Estructura genérica del mensaje reportado.
 *  Ajusta o extiende según los campos reales que guardes en "messagereport".
 */
export interface MessageReport {
  message_id: number;
  timestamp?: string;     // ISO string si existe
  [k: string]: any;       // Campos adicionales
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private http = inject(HttpClient);
  private base = environment.url_ws.replace(/\/+$/, ''); // sanea trailing slash

  /** Headers con Authorization si hay token almacenado */
  private headers(): HttpHeaders {
    const token = environment.token; // ajusta la clave si usas otra
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  /** GET /search/messagereport/:message_id
   *  Retorna la lista de documentos que coinciden con ese message_id
   */
  getByMessageId$(
    messageId: number
  ): Observable<ApiEnvelope<MessageReport[]>> {
    const url = `${this.base}/search/messagereport/${encodeURIComponent(String(messageId))}`;
    return this.http.get<ApiEnvelope<MessageReport[]>>(url, { headers: this.headers() });
  }

  /** Versión async/await (helper opcional) */
  async getByMessageId(
    messageId: number
  ): Promise<ApiEnvelope<MessageReport[]>> {
    return firstValueFrom(this.getByMessageId$(messageId));
  }

  /** Obtener TODOS los reports de messagereport (sin messageId) */
  getAllReports$(): Observable<ApiEnvelope<MessageReport[]>> {
    const url = `${this.base}/search/messagereport`;
    return this.http.get<ApiEnvelope<MessageReport[]>>(url, { headers: this.headers() });
  }

  /** Versión async/await (helper opcional) */
  async getAllReports(): Promise<ApiEnvelope<MessageReport[]>> {
    return firstValueFrom(this.getAllReports$());
  }

}
