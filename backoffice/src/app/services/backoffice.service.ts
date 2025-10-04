// backoffice.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from './../../environments/environment';

export interface ApiEnvelope<T> {
  response: T;
  status: number;
}

export interface BackofficeUser {
  id: number;
  username: string;
  // agrega otros campos que guardes en managers (excepto password)
  [k: string]: any;
}

export interface LoginResponse {
  username: string;
  allowed: boolean;
  status: number;
}

@Injectable({ providedIn: 'root' })
export class BackofficeService {
  private http = inject(HttpClient);
  private base = environment.url_ws.replace(/\/+$/, ''); // sanea trailing slash

  /** Headers con Authorization si hay token almacenado */
  private headers(): HttpHeaders {
    const token = environment.token; // ajusta la clave si usas otra
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  // ======================
  //        LOGIN
  // ======================

  /** POST /backoffice/login -> { username, allowed, status } */
  login$(credentials: { username: string; password: string }): Observable<LoginResponse> {
    const url = `${this.base}/backoffice/login`;
    // El login no requiere Authorization (el WS lo permite sin token)
    return this.http.post<LoginResponse>(url, credentials, { headers: this.headers() });
  }
  async login(credentials: { username: string; password: string }): Promise<LoginResponse> {
    return firstValueFrom(this.login$(credentials));
  }

  /** Helpers opcionales para manejar un JWT si decides emitirlo luego */
  setToken(token: string) { localStorage.setItem('token', token); }
  getToken(): string | null { return localStorage.getItem('token'); }
  clearToken() { localStorage.removeItem('token'); }

  // ======================
  //   BACKOFFICE USERS
  // ======================

  /** GET /backoffice/user -> lista de usuarios */
  getAllUsers$(): Observable<ApiEnvelope<BackofficeUser[]>> {
    const url = `${this.base}/backoffice/user`;
    return this.http.get<ApiEnvelope<BackofficeUser[]>>(url, { headers: this.headers() });
  }
  async getAllUsers(): Promise<ApiEnvelope<BackofficeUser[]>> {
    return firstValueFrom(this.getAllUsers$());
  }

  /** GET /backoffice/user/:username -> un usuario */
  getUserByUsername$(username: string): Observable<ApiEnvelope<BackofficeUser>> {
    const url = `${this.base}/backoffice/user/${encodeURIComponent(username)}`;
    return this.http.get<ApiEnvelope<BackofficeUser>>(url, { headers: this.headers() });
  }
  async getUserByUsername(username: string): Promise<ApiEnvelope<BackofficeUser>> {
    return firstValueFrom(this.getUserByUsername$(username));
  }

  /** POST /backoffice/user -> crea usuario (username & password requeridos por WS) */
  createUser$(payload: { username: string; password: string; [k: string]: any }): Observable<ApiEnvelope<BackofficeUser>> {
    const url = `${this.base}/backoffice/user`;
    return this.http.post<ApiEnvelope<BackofficeUser>>(url, payload, { headers: this.headers() });
  }
  async createUser(payload: { username: string; password: string; [k: string]: any }): Promise<ApiEnvelope<BackofficeUser>> {
    return firstValueFrom(this.createUser$(payload));
  }

  /** PATCH /backoffice/user -> actualiza por { id, ...campos } */
  updateUser$(payload: { id: number; username?: string; password?: string; [k: string]: any }): Observable<ApiEnvelope<Partial<BackofficeUser>>> {
    const url = `${this.base}/backoffice/user`;
    return this.http.patch<ApiEnvelope<Partial<BackofficeUser>>>(url, payload, { headers: this.headers() });
  }
  async updateUser(payload: { id: number; username?: string; password?: string; [k: string]: any }): Promise<ApiEnvelope<Partial<BackofficeUser>>> {
    return firstValueFrom(this.updateUser$(payload));
  }

  /** DELETE /backoffice/user?id=123 -> elimina por id */
  deleteUser$(id: number): Observable<ApiEnvelope<string>> {
    const url = `${this.base}/backoffice/user`;
    const params = new HttpParams().set('id', String(id));
    return this.http.delete<ApiEnvelope<string>>(url, { headers: this.headers(), params });
  }
  async deleteUser(id: number): Promise<ApiEnvelope<string>> {
    return firstValueFrom(this.deleteUser$(id));
  }
}
