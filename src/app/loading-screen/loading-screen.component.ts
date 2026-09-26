import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
    selector: 'gg-loading-screen',
    imports: [NgOptimizedImage],
    template: `
        <h1>GEN-GAME</h1>
        <img ngSrc="images/duck.gif" width="250" height="250" alt="Gen Game duck" priority />
        @if (error(); as message) {
            <h2>ERROR</h2>
            <p>{{ message }}</p>
        }
        @else {
            <h2>LOADING...</h2>
        }
    `,
    styleUrl: './loading-screen.component.scss',
})
export class LoadingScreenComponent {
    readonly error = input<string | null>(null);
}
