import { Directive, HostBinding, HostListener, Output, EventEmitter } from '@angular/core';

@Directive({
  selector: '[dropzone]',
  standalone: true, // <-- THIS is required to import in a standalone component
})
export class DropzoneDirective {
  @HostBinding('class.ring-2') hovering = false;
  @HostBinding('class.ring-indigo-400') get ringColor() { return this.hovering; }

  @Output() files = new EventEmitter<FileList>();

  @HostListener('dragover', ['$event'])
  onOver(e: DragEvent) {
    e.preventDefault();
    this.hovering = true;
  }

  @HostListener('dragleave')
  onLeave() {
    this.hovering = false;
  }

  @HostListener('drop', ['$event'])
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.hovering = false;
    if (e.dataTransfer?.files?.length) {
      this.files.emit(e.dataTransfer.files);
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(e: ClipboardEvent) {
    const items = e.clipboardData?.files;
    if (items && items.length) {
      this.files.emit(items);
    }
  }
}
