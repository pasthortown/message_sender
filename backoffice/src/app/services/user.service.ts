// user.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from './../../environments/environment';

export interface ApiEnvelope<T> {
  response: T;
  status: number;
}

// Documento genérico almacenado en "users"
export interface UserDoc {
  email: string;
  timestamp?: string;
  [k: string]: any;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = environment.url_ws.replace(/\/+$/, ''); // quita trailing slash

  /** Headers con Authorization si hay token */
  private headers(): HttpHeaders {
    const token = environment.token; // ajusta la clave si usas otra
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  /** GET /search/users/:email
   *  Retorna array de coincidencias; 404 si no hay resultados.
   */
  getByEmail$(
    email: string
  ): Observable<ApiEnvelope<UserDoc[]>> {
    const url = `${this.base}/search/users/${encodeURIComponent(email)}`;
    return this.http.get<ApiEnvelope<UserDoc[]>>(url, { headers: this.headers() });
  }

  /** Versión async/await (helper opcional) */
  async getByEmail(
    email: string
  ): Promise<ApiEnvelope<UserDoc[]>> {
    return firstValueFrom(this.getByEmail$(email));
  }
}
