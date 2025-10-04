// user-group.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from './../../environments/environment';

export interface ApiEnvelope<T> {
  response: T;
  status: number;
}

/** Documento típico de la colección "usersgroup".
 *  Ajusta los campos según tu esquema real.
 */
export interface UserGroupDoc {
  email: string;
  group?: string;
  timestamp?: string;
  [k: string]: any;
}

@Injectable({ providedIn: 'root' })
export class UserGroupService {
  private http = inject(HttpClient);
  private base = environment.url_ws.replace(/\/+$/, ''); // quita trailing slash

  /** Headers con Authorization si hay token almacenado */
  private headers(): HttpHeaders {
    const token = environment.token; // ajusta la clave si usas otra
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  /** GET /search/usersgroup/:email
   *  Retorna los grupos asignados a ese email (array).
   *  Si no hay resultados, el WS responde 404 con mensaje.
   */
  getByEmail$(
    email: string
  ): Observable<ApiEnvelope<UserGroupDoc[]>> {
    const url = `${this.base}/search/usersgroup/${encodeURIComponent(email)}`;
    return this.http.get<ApiEnvelope<UserGroupDoc[]>>(url, { headers: this.headers() });
  }

  /** Versión async/await (helper opcional) */
  async getByEmail(
    email: string
  ): Promise<ApiEnvelope<UserGroupDoc[]>> {
    return firstValueFrom(this.getByEmail$(email));
  }
}
