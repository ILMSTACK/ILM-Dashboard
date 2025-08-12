import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  constructor(private translate: TranslateService) {
    // Check if the code is running in the browser (window is available)
    const isBrowser = typeof window !== 'undefined';

    if (isBrowser) {
      // Check for saved language in localStorage or fallback to 'en'
      const savedLang = localStorage.getItem('language') || 'en';
      this.translate.setDefaultLang(savedLang); // Set default language
      this.translate.use(savedLang); // Set current language to saved one
    }
  }

  changeLanguage(lang: string) {
    // Ensure localStorage is only used in the browser
    if (typeof window !== 'undefined') {
      // Change the language using ngx-translate
      this.translate.use(lang);
      // Save the selected language to localStorage
      localStorage.setItem('language', lang);
    }
  }

  getCurrentLanguage(): string {
    return this.translate.currentLang;
  }
}
