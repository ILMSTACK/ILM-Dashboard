import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';
import { GlobalStoreService } from '../store/global-state/global-store.service';


export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const globalStore = inject(GlobalStoreService);
  const apiKey = environment.API_KEY;
  
  // Always add the API key
  let headers = req.headers.set('X-API-Key', apiKey);
  
  // Get token from store
  const token = globalStore.getValue('token');
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }
  
  const cloned = req.clone({ headers });
  return next(cloned);
};