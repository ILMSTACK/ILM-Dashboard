// dialog.service.ts
import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {ModalConfig} from "./modal-interface";
import { ModalServiceComponent } from './modal-service.component';
import { TranslationService } from '../translation/services/translation.service';
import { TranslateModule } from '@ngx-translate/core';

import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private dialog = inject(MatDialog);
  
  constructor(private translationService: TranslationService) {}

  confirm(message: string, title: string = 'Confirmation'): Observable<boolean> {
    return this.openDialog({
      title,
      description: message,
      dialogType: 'confirm',
      imgIcon: 'icons/question.png'
    });
  }

  success(message: string, title: string = 'Success'): Observable<boolean> {
    return this.openDialog({
      title,
      description: message,
      dialogType: 'success',
      imgIcon: 'icons/success.png',
      showCancelButton: false
    });
  }

  alert(message: string, title: string = 'Alert'): Observable<boolean> {
    return this.openDialog({
      title,
      description: message,
      dialogType: 'alert',
      imgIcon: 'icons/alert.png',
      showCancelButton: false
    });
  }

  openDialog(config: ModalConfig): Observable<boolean> {
    const dialogRef = this.dialog.open(ModalServiceComponent, {
      width: config.width || '500px',
      data: { config }
    });

    return dialogRef.afterClosed();
  }
}