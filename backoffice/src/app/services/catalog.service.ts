import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from './../../environments/environment';

export interface ApiEnvelope<T> {
  response: T;
  status: number;
}

/** Tip genérico para items del catálogo (Mongo), el WS siempre añade item_id y timestamp */
export type CatalogItem = Record<string, any> & {
  item_id?: number;
  timestamp?: string; // ISO
  schedule?: string | Date;
};

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private http = inject(HttpClient);
  private base = environment.url_ws.replace(/\/+$/, ''); // quita trailing slash

  // ===== Utilidades =====
  private headers(): HttpHeaders {
    const token = environment.token; // ajusta la clave si usas otra
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  /** Convierte schedule: Date -> ISO, deja string tal cual */
  private normalizeSchedule<T extends CatalogItem>(payload: T): T {
    if (payload && payload.schedule instanceof Date) {
      payload = { ...payload, schedule: payload.schedule.toISOString() };
    }
    return payload;
  }

  /** Serializa la proyección si viene como objeto */
  private serializeOutputModel(
    outputModel?: string | Record<string, boolean>
  ): string | undefined {
    if (!outputModel) return undefined;
    return typeof outputModel === 'string' ? outputModel : JSON.stringify(outputModel);
  }

  // ===== CREATE =====
  /** POST /:catalog -> crea documento (item_id y timestamp los pone el WS) */
  create$<T extends CatalogItem = CatalogItem>(
    catalog: string,
    payload: T
  ): Observable<ApiEnvelope<T>> {
    const url = `${this.base}/${encodeURIComponent(catalog)}`;
    const body = this.normalizeSchedule(payload);
    return this.http.post<ApiEnvelope<T>>(url, body, { headers: this.headers() });
  }
  async create<T extends CatalogItem = CatalogItem>(
    catalog: string,
    payload: T
  ): Promise<ApiEnvelope<T>> {
    return firstValueFrom(this.create$(catalog, payload));
  }

  // ===== READ =====
  /** GET /:catalog (lista completa) con proyección opcional via output_model */
  list$<T extends CatalogItem = CatalogItem>(
    catalog: string,
    options?: { outputModel?: string | Record<string, boolean> }
  ): Observable<ApiEnvelope<T[]>> {
    const url = `${this.base}/${encodeURIComponent(catalog)}`;
    const output_model = this.serializeOutputModel(options?.outputModel);
    let params = new HttpParams();
    if (output_model) params = params.set('output_model', output_model);
    return this.http.get<ApiEnvelope<T[]>>(url, { headers: this.headers(), params });
  }
  async list<T extends CatalogItem = CatalogItem>(
    catalog: string,
    options?: { outputModel?: string | Record<string, boolean> }
  ): Promise<ApiEnvelope<T[]>> {
    return firstValueFrom(this.list$(catalog, options));
  }

  /** GET /:catalog?id=123 (un documento) con proyección opcional */
  getById$<T extends CatalogItem = CatalogItem>(
    catalog: string,
    itemId: number,
    options?: { outputModel?: string | Record<string, boolean> }
  ): Observable<ApiEnvelope<T>> {
    const url = `${this.base}/${encodeURIComponent(catalog)}`;
    const output_model = this.serializeOutputModel(options?.outputModel);
    let params = new HttpParams().set('id', String(itemId));
    if (output_model) params = params.set('output_model', output_model);
    return this.http.get<ApiEnvelope<T>>(url, { headers: this.headers(), params });
  }
  async getById<T extends CatalogItem = CatalogItem>(
    catalog: string,
    itemId: number,
    options?: { outputModel?: string | Record<string, boolean> }
  ): Promise<ApiEnvelope<T>> {
    return firstValueFrom(this.getById$(catalog, itemId, options));
  }

  // ===== UPDATE =====
  /** PATCH /:catalog -> requiere { item_id, ... } en body */
  update$<T extends CatalogItem = CatalogItem>(
    catalog: string,
    payload: T & { item_id: number }
  ): Observable<ApiEnvelope<Partial<T>>> {
    const url = `${this.base}/${encodeURIComponent(catalog)}`;
    const body = this.normalizeSchedule(payload);
    return this.http.patch<ApiEnvelope<Partial<T>>>(url, body, { headers: this.headers() });
  }
  async update<T extends CatalogItem = CatalogItem>(
    catalog: string,
    payload: T & { item_id: number }
  ): Promise<ApiEnvelope<Partial<T>>> {
    return firstValueFrom(this.update$(catalog, payload));
  }

  // ===== DELETE =====
  /** DELETE /:catalog?id=123 */
  delete$(
    catalog: string,
    itemId: number
  ): Observable<ApiEnvelope<string>> {
    const url = `${this.base}/${encodeURIComponent(catalog)}`;
    const params = new HttpParams().set('id', String(itemId));
    return this.http.delete<ApiEnvelope<string>>(url, { headers: this.headers(), params });
  }
  async delete(
    catalog: string,
    itemId: number
  ): Promise<ApiEnvelope<string>> {
    return firstValueFrom(this.delete$(catalog, itemId));
  }
}
