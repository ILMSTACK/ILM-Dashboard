import { Injectable, DestroyRef, inject, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, interval, Observable, Subject, Subscription, of, timer } from 'rxjs';
import { debounceTime, filter, take, tap, catchError, finalize, retryWhen, delayWhen } from 'rxjs/operators';
import { NavigationStart, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { GlobalStoreService } from './../../services/store/global-state/global-store.service';

export type InteractionType = 'view' | 'click' | 'search' | 'shop_visit' | 'page_time' | 'engagement';
export type TargetType = 'product' | 'shop' | 'search_query' | 'business_product' | 'company' | 'page' | 'category' | 'feature' | 'section' | 'business';

export interface UserInteraction {
  userID?: string;
  type: InteractionType;
  targetType: TargetType;
  targetID?: string;
  searchQuery?: string;
  categoryId?: string;
  businessId?: string;
  timestamp?: string;
  duration?: number;
  metadata?: {
    device?: string;
    platform?: string;
    browser?: string;
    location?: string;
    referrer?: string;
    url?: string;
    sessionID?: string;
    screenSize?: string;
    customData?: Record<string, any>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class InteractionTrackerService {
  private pendingInteractions: UserInteraction[] = [];
  private readonly STORAGE_KEY = 'pending_interactions';
  private readonly SESSION_ID_KEY = 'tracking_session_id';
 private readonly API_ENDPOINT = environment.API_URL + '/api/v1/log/logInteraction';
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 20000; // 20 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds
  
  private flushTimer: Subscription | null = null;
  private isFlushInProgress = false;
  private manualFlush$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private isBrowser: boolean;
  private sessionID: string;
  private pageTimeTracker: Map<string, number> = new Map();
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private globalStore: GlobalStoreService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.sessionID = this.getOrCreateSessionId();
    
    if (this.isBrowser) {
      this.loadFromLocalStorage();
      this.setupFlushTimer();
      this.setupEventListeners();
    }
    
    // Auto-flush when component is destroyed
    this.destroyRef.onDestroy(() => {
      if (this.isBrowser) {
        this.stopAllPageTimers();
        this.flush();
        if (this.flushTimer) {
          this.flushTimer.unsubscribe();
        }
      }
    });
  }

  /**
   * Track a user interaction
   */
  public track(interaction: UserInteraction): void {
    if (!this.isBrowser) return;
    
    // Add timestamp if not provided
    if (!interaction.timestamp) {
      interaction.timestamp = new Date().toISOString();
    }
    
    // Add device info if not provided
    if (!interaction.metadata) {
      interaction.metadata = this.getDefaultMetadata();
    } else {
      // Merge with default metadata, preserving custom data
      const customData = interaction.metadata.customData || {};
      interaction.metadata = {
        ...this.getDefaultMetadata(),
        ...interaction.metadata,
        customData: {
          ...customData
        }
      };
    }
    
    // Add user ID if available
    const userId = this.getUserId();
    if (userId && !interaction.userID) {
      interaction.userID = userId;
    }
    
    // Add to pending interactions
    this.pendingInteractions.push(interaction);
    
    // Save to localStorage for persistence
    this.saveToLocalStorage();
    
    // If we have enough interactions, flush immediately
    if (this.pendingInteractions.length >= this.BATCH_SIZE) {
      this.manualFlush$.next();
    }
  }

  /**
   * Track a batch of interactions at once
   */
  public trackBatch(interactions: UserInteraction[]): void {
    if (!this.isBrowser || !interactions.length) return;
    
    // Process each interaction
    interactions.forEach(interaction => this.track(interaction));
  }

  /**
   * Convenience methods for common interaction types
   */
  public trackView(targetType: TargetType, targetId: string, categoryId?: string, businessId?: string, customData?: Record<string, any>): void {
    this.track({
      type: 'view',
      targetType,
      targetID: targetId,
      categoryId,
      businessId,
      metadata: customData ? { customData } : undefined
    });
  }

  public trackClick(targetType: TargetType, targetId: string, categoryId?: string, businessId?: string, customData?: Record<string, any>): void {
    this.track({
      type: 'click',
      targetType,
      targetID: targetId,
      categoryId,
      businessId,
      metadata: customData ? { customData } : undefined
    });
  }

  public trackSearch(query: string, customData?: Record<string, any>): void {
    this.track({
      type: 'search',
      targetType: 'search_query',
      searchQuery: query,
      metadata: customData ? { customData } : undefined
    });
  }

  public trackShopVisit(businessId: string, customData?: Record<string, any>): void {
    this.track({
      type: 'shop_visit',
      targetType: 'shop',
      businessId,
      metadata: customData ? { customData } : undefined
    });
  }

  /**
   * Start tracking time spent on a page or feature
   */
  public startPageTimeTracking(pageId: string): void {
    if (!this.isBrowser) return;
    
    this.pageTimeTracker.set(pageId, Date.now());
  }

  /**
   * Stop tracking time and log the interaction
   */
  public stopPageTimeTracking(pageId: string, customData?: Record<string, any>): void {
    if (!this.isBrowser) return;
    
    const startTime = this.pageTimeTracker.get(pageId);
    if (!startTime) return;
    
    const duration = Date.now() - startTime;
    this.pageTimeTracker.delete(pageId);
    
    // Only track if more than 1 second
    if (duration > 1000) {
      this.track({
        type: 'page_time',
        targetType: 'page',
        targetID: pageId,
        duration,
        metadata: {
          customData: {
            ...customData,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date().toISOString()
          }
        }
      });
    }
  }

  /**
   * Track engagement with custom data
   */
  public trackEngagement(targetType: TargetType, targetId: string, details: Record<string, any>): void {
    this.track({
      type: 'engagement',
      targetType,
      targetID: targetId,
      metadata: {
        customData: details
      }
    });
  }

  /**
   * Stop all active page timers and record their durations
   */
  private stopAllPageTimers(): void {
    if (!this.isBrowser || this.pageTimeTracker.size === 0) return;
    
    const now = Date.now();
    
    this.pageTimeTracker.forEach((startTime, pageId) => {
      const duration = now - startTime;
      
      // Only track if more than 1 second
      if (duration > 1000) {
        this.track({
          type: 'page_time',
          targetType: 'page',
          targetID: pageId,
          duration,
          metadata: {
            customData: {
              startTime: new Date(startTime).toISOString(),
              endTime: new Date(now).toISOString(),
              autoStopped: true
            }
          }
        });
      }
    });
    
    // Clear the tracker
    this.pageTimeTracker.clear();
  }

  /**
   * Manual flush - sends pending interactions to the server
   */
  public flush(): Observable<any> | null {
    // If there's nothing to flush or a flush is in progress, do nothing
    if (!this.isBrowser || this.pendingInteractions.length === 0 || this.isFlushInProgress) {
      return null;
    }

    // Mark flush as in progress to prevent concurrent flushes
    this.isFlushInProgress = true;

    // Copy interactions to send
    const interactionsToSend = [...this.pendingInteractions];
    
    // Prepare the payload (single object or array based on count)
    const payload = interactionsToSend.length === 1 ? interactionsToSend[0] : interactionsToSend;
    
    return this.http.post(this.API_ENDPOINT, payload)
      .pipe(
        retryWhen(errors => 
          errors.pipe(
            tap(err => console.warn('Error sending interactions, will retry:', err)),
            take(this.MAX_RETRIES),
            delayWhen(() => timer(this.RETRY_DELAY))
          )
        ),
        tap({
          next: () => {
            // Remove sent interactions from pending list
            this.pendingInteractions = this.pendingInteractions.slice(interactionsToSend.length);
            
            // Update localStorage
            this.saveToLocalStorage();
            
            console.log(`Successfully flushed ${interactionsToSend.length} interactions`);
          },
          error: (error) => {
            console.error('Failed to flush interactions after retries:', error);
          }
        }),
        finalize(() => {
          this.isFlushInProgress = false;
        }),
        catchError(error => {
          this.isFlushInProgress = false;
          return of(error);
        }),
        take(1)
      );
  }

  /**
   * Clear all pending interactions without sending them
   */
  public clearInteractions(): void {
    if (!this.isBrowser) return;
    
    this.pendingInteractions = [];
    this.saveToLocalStorage();
  }


  /**
   * Get the current user ID
   */
  public getUserId(): string | null {
    if (!this.isBrowser) return null;
    
    try {
      const userID =  this.globalStore.getValue('userId');
      return userID ? userID : 'Public_User';
    } catch (error) {
      console.error('Failed to get user ID:', error);
      return null;
    }
  }

  /**
   * Generate or get the session ID
   */
  private getOrCreateSessionId(): string {
    if (!this.isBrowser) return 'server';
    
    try {
      let sessionId = sessionStorage.getItem(this.SESSION_ID_KEY);
      if (!sessionId) {
        sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        sessionStorage.setItem(this.SESSION_ID_KEY, sessionId);
      }
      return sessionId;
    } catch (error) {
      console.error('Failed to manage session ID:', error);
      return `fallback-${Date.now()}`;
    }
  }

  /**
   * Get default metadata for interactions
   */
  private getDefaultMetadata() {
    if (!this.isBrowser) {
      return { device: 'server' };
    }
    
    return {
      device: this.getDeviceType(),
      browser: this.getBrowserInfo(),
      platform: navigator.platform,
      url: window.location.href,
      referrer: document.referrer,
      sessionID: this.sessionID,
      screenSize: `${window.innerWidth}x${window.innerHeight}`
    };
  }

  /**
   * Get device type based on user agent
   */
  private getDeviceType(): string {
    if (!this.isBrowser) return 'unknown';
    
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      return 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Get browser information
   */
  private getBrowserInfo(): string {
    if (!this.isBrowser) return 'unknown';
    
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.indexOf('edge') > -1) return 'edge';
    if (userAgent.indexOf('chrome') > -1) return 'chrome';
    if (userAgent.indexOf('firefox') > -1) return 'firefox';
    if (userAgent.indexOf('safari') > -1) return 'safari';
    if (userAgent.indexOf('opera') > -1 || userAgent.indexOf('opr') > -1) return 'opera';
    if (userAgent.indexOf('msie') > -1 || userAgent.indexOf('trident') > -1) return 'ie';
    
    return 'unknown';
  }

  private loadFromLocalStorage(): void {
    if (!this.isBrowser) return;
    
    try {
      const savedInteractions = localStorage.getItem(this.STORAGE_KEY);
      if (savedInteractions) {
        this.pendingInteractions = JSON.parse(savedInteractions);
      }
    } catch (error) {
      console.error('Failed to load interactions from localStorage:', error);
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch (e) {
        // Silently fail if removeItem also fails
      }
    }
  }

  private saveToLocalStorage(): void {
    if (!this.isBrowser) return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.pendingInteractions));
    } catch (error) {
      console.error('Failed to save interactions to localStorage:', error);
    }
  }

  private setupFlushTimer(): void {
    if (!this.isBrowser) return;
    
    // Set up interval-based flushing
    this.flushTimer = interval(this.FLUSH_INTERVAL)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(() => this.pendingInteractions.length > 0 && !this.isFlushInProgress)
      )
      .subscribe(() => {
        const flushObservable = this.flush();
        if (flushObservable) {
          flushObservable.subscribe();
        }
      });
    
    // Set up manual flush triggers
    this.manualFlush$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(300), // Prevent rapid consecutive flushes
        filter(() => !this.isFlushInProgress)
      )
      .subscribe(() => {
        const flushObservable = this.flush();
        if (flushObservable) {
          flushObservable.subscribe();
        }
      });
  }

  private setupEventListeners(): void {
    if (!this.isBrowser) return;
    
    // Flush on route changes
    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(event => event instanceof NavigationStart),
        tap(() => {
          // Complete any active page timing
          this.stopAllPageTimers();
        }),
        filter(() => this.pendingInteractions.length > 0 && !this.isFlushInProgress)
      )
      .subscribe(() => this.manualFlush$.next());
    
    // Flush on tab visibility changes
    fromEvent(document, 'visibilitychange')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          if (document.visibilityState === 'hidden') {
            // Complete any active page timing when tab is hidden
            this.stopAllPageTimers();
          }
        }),
        filter(() => document.visibilityState === 'hidden' && this.pendingInteractions.length > 0),
        debounceTime(100)
      )
      .subscribe(() => this.manualFlush$.next());
    
    // Flush on beforeunload (page close or refresh)
    fromEvent(window, 'beforeunload')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          // Complete any active page timing
          this.stopAllPageTimers();
        }),
        filter(() => this.pendingInteractions.length > 0)
      )
      .subscribe(() => {
        // Use sendBeacon for more reliable delivery during page unload
        if (navigator.sendBeacon) {
          const blob = new Blob(
            [JSON.stringify(this.pendingInteractions.length === 1 ? 
                            this.pendingInteractions[0] : 
                            this.pendingInteractions)], 
            { type: 'application/json' }
          );
          navigator.sendBeacon(this.API_ENDPOINT, blob);
          this.clearInteractions();
        } else {
          // Force synchronous XMLHttpRequest as fallback
          try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', this.API_ENDPOINT, false);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(this.pendingInteractions.length === 1 ? 
                                    this.pendingInteractions[0] : 
                                    this.pendingInteractions));
            this.clearInteractions();
          } catch (error) {
            console.error('Failed to send interactions during page unload:', error);
          }
        }
      });
  }
}