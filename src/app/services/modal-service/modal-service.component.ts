import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import {ModalConfig} from "./modal-interface";


@Component({
  selector: 'app-modal-service',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './modal-service.component.html',
  styleUrl: './modal-service.component.scss'
})
export class ModalServiceComponent {
  private readonly dialogRef = inject(MatDialogRef<ModalServiceComponent>);
  private readonly data = inject(MAT_DIALOG_DATA);

  title: string = 'Confirmation';
  description: string = 'Are you sure you want to proceed?';
  imgIcon: string = 'assets/icons/question.svg';
  iconClass: string = 'confirmation-icon';
  cancelLabel: string = 'Cancel';
  successLabel: string = 'Confirm';
  showDescription: boolean = true;
  showCancelButton: boolean = true;
  showSubmitButton: boolean = true;
  showTitle: boolean = true;
  showIcon: boolean = true;
  dialogType: 'confirm' | 'alert' | 'success' = 'confirm';

  constructor() {
    const config = this.data.config as ModalConfig;
    if (config) {
      Object.assign(this, config);
    }
  }
  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onSubmit() {
    this.dialogRef.close(true);
  }

  onClose(): void {
    this.dialogRef.close(false);
  }
}
