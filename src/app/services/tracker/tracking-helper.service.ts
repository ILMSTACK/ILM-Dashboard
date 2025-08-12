import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { InteractionTrackerService, TargetType } from './interaction-tracker.service';

@Injectable({
  providedIn: 'root'
})
export class TrackingHelperService {
  private currentPage: string | null = null;
  private pageStartTime: number | null = null;

  constructor(
    private tracker: InteractionTrackerService,
    private router: Router
  ) {
    // Set up automatic page tracking
    this.setupRouteTracking();
  }

  /**
   * Track product view
   */
  trackProductView(productId: string, categoryId?: string, businessId?: string): void {
    this.tracker.trackView('product', productId, categoryId, businessId);
  }

  /**
   * Track business view
   */
  trackBusinessView(businessId: string, categoryId?: string): void {
    this.tracker.trackView('shop', businessId, categoryId);
  }

  /**
   * Track category view
   */
  trackCategoryView(categoryId: string): void {
    this.tracker.trackView('category', categoryId);
  }

  /**
   * Track product click
   */
  trackProductClick(productId: string, categoryId?: string, businessId?: string): void {
    this.tracker.trackClick('product', productId, categoryId, businessId);
  }

  /**
   * Track business click
   */
  trackBusinessClick(businessId: string, categoryId?: string): void {
    this.tracker.trackClick('shop', businessId, categoryId);
  }

  /**
   * Track button/element click
   */
  trackFeatureClick(featureId: string, additionalData?: Record<string, any>): void {
    this.tracker.trackClick('feature', featureId, undefined, undefined, additionalData);
  }

  /**
   * Track search query
   */
  trackSearch(query: string, additionalData?: Record<string, any>): void {
    this.tracker.trackSearch(query, additionalData);
  }

  /**
   * Track cart action
   */
  trackCartAction(
    action: 'add' | 'remove' | 'update' | 'checkout', 
    productId: string,
    quantity: number,
    additionalData?: Record<string, any>
  ): void {
    this.tracker.trackEngagement('product', productId, {
      action,
      quantity,
      ...additionalData
    });
  }

  /**
   * Track form submission
   */
  trackFormSubmission(
    formId: string, 
    success: boolean,
    additionalData?: Record<string, any>
  ): void {
    this.tracker.trackEngagement('feature', formId, {
      action: 'form_submit',
      success,
      ...additionalData
    });
  }

  /**
   * Track error
   */
  trackError(
    errorType: string,
    errorMessage: string,
    source?: string
  ): void {
    this.tracker.trackEngagement('feature', 'error', {
      errorType,
      errorMessage,
      source,
      url: window.location.href
    });
  }

  /**
   * Track section view
   */
  trackSectionView(
    sectionId: string,
    pageId?: string,
    additionalData?: Record<string, any>
  ): void {
    this.tracker.trackView('section', sectionId, undefined, undefined, {
      pageId,
      ...additionalData
    });
  }

  /**
   * Start tracking time on a specific page or section
   */
  startTimeTracking(pageId: string): void {
    this.tracker.startPageTimeTracking(pageId);
  }

  /**
   * Stop tracking time on a specific page or section
   */
  stopTimeTracking(pageId: string, additionalData?: Record<string, any>): void {
    this.tracker.stopPageTimeTracking(pageId, additionalData);
  }

  /**
   * Auto-track page views based on router navigation
   */
  private setupRouteTracking(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(event => event as NavigationEnd)
    ).subscribe(event => {
      // Extract page ID from URL (remove parameters and normalize)
      const pageUrl = event.urlAfterRedirects.split('?')[0];
      const pageId = pageUrl === '/' ? 'home' : pageUrl.replace(/^\/+|\/+$/g, '').replace(/\//g, '_');
      
      // Stop tracking previous page
      if (this.currentPage) {
        this.stopTimeTracking(this.currentPage);
      }
      
      // Track page view
      this.tracker.trackView('page', pageId);
      
      // Start tracking time on new page
      this.startTimeTracking(pageId);
      this.currentPage = pageId;
    });
  }

  /**
   * Track a batch of interactions
   */
  trackBatch(interactions: any[]): void {
    this.tracker.trackBatch(interactions);
  }

  /**
   * Force flush all pending interactions
   */
  flush(): void {
    const flushObservable = this.tracker.flush();
    if (flushObservable) {
      flushObservable.subscribe();
    }
  }
}