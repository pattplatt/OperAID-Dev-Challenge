import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService extends Socket {
  mqtt$: Observable<{ topic: string; payload: { machineId: string; scrapIndex: number; value: number; timestamp: string }; ts: number }>;

  constructor() {
    super({ url: environment.backendUrl, options: {} });

    this.mqtt$ = this.fromEvent<{ topic: string; payload: string }>('mqtt').pipe(
      map(msg => ({
        topic: msg.topic,
        payload: JSON.parse(msg.payload),
        ts: Date.now()
      }))
    );
  }
}