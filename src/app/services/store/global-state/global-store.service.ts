// src/app/services/global-store.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

export interface GlobalState {
  isLogin: boolean;
  userName: string;
  userId: string;  // Added userId as requested
  darkMode: boolean;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalStoreService {
  private initialState: GlobalState = {
    isLogin: false,
    userName: '',
    userId: '',
    darkMode: false,
    token: 'guest'
  };

  private state = new BehaviorSubject<GlobalState>(this.initialState);
  
  // Expose as observables
  readonly state$ = this.state.asObservable();
  

  //=========================== USE FOR PROFILE  =========================
  readonly userName$ = this.state$.pipe(map(state => state.userName));
  readonly userId$ = this.state$.pipe(map(state => state.userId));
  readonly isLogin$ = this.state$.pipe(map(state => state.isLogin));

  //=========================== USE FOR THEME MODE  =========================
  readonly darkMode$ = this.state$.pipe(map(state => state.darkMode));

  //=========================== USE FOR HTTP =========================
  readonly token$ = this.state$.pipe(map(state => state.token));
  
  constructor(@Inject(PLATFORM_ID) private platformId: any) {
   
    if (isPlatformBrowser(this.platformId)) {
      this.loadFromLocalStorage();
    }
  }
  
  // GET a single value by key
  getValue<K extends keyof GlobalState>(key: K): GlobalState[K] {
    return this.state.getValue()[key];
  }
  
  // SET a single value by key
  setValue<K extends keyof GlobalState>(key: K, value: GlobalState[K]): void {
    const newState = {
      ...this.state.getValue(),
      [key]: value
    };
    this.state.next(newState);
    this.saveToLocalStorage();
  }
  
  //============================ SETTER  =========================
  setUserId(id: string): void {
    this.setValue('userId', id);
  }
  
  setUserName(name: string): void {
    this.setValue('userName', name);
  }
  
  setIsLogin(isLogin: boolean): void {
    this.setValue('isLogin', isLogin);
  }

  setToken(token: string): void {
    this.setValue('token', token);
  }
  
  // Common actions
  login(userName: string, userId: string): void {
    const newState = {
      ...this.state.getValue(),
      isLogin: true,
      userName: userName,
      userId: userId
    };
    this.state.next(newState);
    this.saveToLocalStorage();
  }
  
  logout(): void {
    const newState = {
      ...this.state.getValue(),
      isLogin: false,
      userName: '',
      userId: '',
      token: ''
    };
    this.state.next(newState);
    this.saveToLocalStorage();
  }
  
  // Save entire state to localStorage
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('appState', JSON.stringify(this.state.getValue()));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }
  
  // Load state from localStorage
  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('appState');
      if (saved) {
        const parsedState = JSON.parse(saved);
        this.state.next({...this.initialState, ...parsedState});
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }
  }
}