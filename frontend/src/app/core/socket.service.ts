import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';
import { distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

type MqttMsg = {
  machineId: string;
  scrapIndex: number;
  sumLast60s: number;
  avgLast60s: number;
  countLast60s: number;
  timestamp: string;
};

@Injectable({ providedIn: 'root' })
export class SocketService extends Socket {

  private readonly mqttMessage$: Observable<MqttMsg> = (this.fromEvent('mqtt') as Observable<MqttMsg>).pipe(
    distinctUntilChanged(
      (a, b) =>
        a.timestamp === b.timestamp &&
        a.machineId === b.machineId &&
        a.scrapIndex === b.scrapIndex &&
        a.sumLast60s === b.sumLast60s &&
        a.avgLast60s === b.avgLast60s &&
        a.countLast60s === b.countLast60s
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    // WebSocket URL configured via environment file
    super({ url: environment.socketUrl, options: {} });
  }

  /** Public stream every component can consume. */
  get stream$(): Observable<MqttMsg> {
    return this.mqttMessage$;
  }
}
