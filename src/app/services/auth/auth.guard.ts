// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service'; 
import { MatDialog } from '@angular/material/dialog';
import { AuthComponent } from './../../components/views/auth/auth.component';
import { GlobalStoreService } from './../../services/store/global-state/global-store.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService, 
    private router: Router,
    private dialog: MatDialog,
    private globalStore: GlobalStoreService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    console.log('AuthGuard: Checking authentication status...');
    const isLogin = this.globalStore.getValue('isLogin');
    if (isLogin) {
      return true;
    }
    
    // Open the existing auth modal dialog
    const dialogRef = this.dialog.open(AuthComponent, {
      width: '400px',
      maxWidth: '95vw',
      disableClose: false,
      autoFocus: true,
      panelClass: ['bg-white', 'rounded-lg', 'shadow-xl']
    });

    // You can optionally subscribe to the dialog close event if you want 
    // to navigate to the requested URL after successful authentication
    dialogRef.afterClosed().subscribe(result => {
    });
    
    // Stay on the current URL but prevent access to the route
    return false;
  }
}