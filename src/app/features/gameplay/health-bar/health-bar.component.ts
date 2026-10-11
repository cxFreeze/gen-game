import { Component, computed, input } from '@angular/core';
import { HeartComponent } from '../../../shared/heart/heart.component';
import { healthPerHeart } from '../health-display';

@Component({
    selector: 'gg-health-bar',
    imports: [HeartComponent],
    host: {
        'role': 'meter',
        'aria-label': 'Health',
        'aria-valuemin': '0',
        '[attr.aria-valuemax]': 'max()',
        '[attr.aria-valuenow]': 'current()',
    },
    template: `
        @for (heart of hearts(); track heart.index) {
            <gg-heart [fill]="heart.fill" />
        }
    `,
    styleUrl: './health-bar.component.scss',
})
export class HealthBarComponent {
    readonly current = input.required<number>();
    readonly max = input.required<number>();
    protected readonly hearts = computed(() => {
        const currentHealth = this.current();
        return Array.from({ length: Math.ceil(this.max() / healthPerHeart) }, (_, index) => {
            const remainingHealth = currentHealth - index * healthPerHeart;
            const fill: 0 | 0.5 | 1 = remainingHealth >= healthPerHeart ? 1 : remainingHealth > 0 ? 0.5 : 0;
            return { index, fill };
        });
    });
}
