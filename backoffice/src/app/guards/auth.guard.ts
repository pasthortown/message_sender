import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (_route, state) => {
  const username = (sessionStorage.getItem('username') ?? '').trim();

  // Permitir si está autenticado
  if (username !== '') return true;

  // Si no, redirigir a /login (con returnUrl opcional)
  const router = inject(Router);
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
