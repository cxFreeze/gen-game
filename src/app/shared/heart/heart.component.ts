import { Component, input } from '@angular/core';

@Component({
    selector: 'gg-heart',
    host: { 'aria-hidden': 'true' },
    template: `
        <svg viewBox="0 0 20 20" focusable="false" [class.is-filled]="fill() === 1">
            @if (fill() === 0.5) {
                <path class="half-fill" d="M3 3H7V4H9V6H10V17H9V16H8V14H6V12H4V10H2V4H3Z" />
            }
            <path class="outline"
                d="M3 3H7V4H9V6H11V4H13V3H17V4H18V10H16V12H14V14H12V16H11V17H9V16H8V14H6V12H4V10H2V4H3Z" />
            @if (fill() > 0) {
                <path class="highlight" d="M4 5H7V7H5V9H4Z" />
            }
        </svg>
    `,
    styleUrl: './heart.component.scss',
})
export class HeartComponent {
    readonly fill = input<0 | 0.5 | 1>(0);
}
