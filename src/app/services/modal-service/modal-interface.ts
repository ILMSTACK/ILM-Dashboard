// dialog.interface.ts
export interface ModalConfig {
    width?: string;
    title?: string;
    description?: string;
    imgIcon?: string;
    iconClass?: string;
    cancelLabel?: string;
    successLabel?: string;
    showDescription?: boolean;
    showCancelButton?: boolean;
    showSubmitButton?: boolean;
    showTitle?: boolean;
    showIcon?: boolean;
    dialogType?: 'confirm' | 'alert' | 'success';
  }