import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#F2E8DA"/>' +
  '<path d="M170 150h60M178 150c0 30-34 42-34 100a56 56 0 0 0 112 0c0-58-34-70-34-100" fill="none" stroke="#D9B99A" ' +
  'stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>');

/** Turns "/uploads/abc.jpg" from the API into a full URL, with a warm placeholder when there is no image. */
@Pipe({ name: 'imgUrl' })
export class ImgUrlPipe implements PipeTransform {
  transform(path: string | null | undefined): string {
    if (!path) { return PLACEHOLDER; }
    if (/^(https?:|data:)/.test(path)) { return path; }
    return environment.serverUrl + path;
  }
}
