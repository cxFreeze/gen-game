import { Component, computed, input } from '@angular/core';
import { HeartComponent } from '../../../shared/heart/heart.component';

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
    private readonly healthPerHeart = 10;
    readonly current = input.required<number>();
    readonly max = input.required<number>();
    protected readonly hearts = computed(() => {
        const currentHealth = this.current();
        return Array.from({ length: Math.ceil(this.max() / this.healthPerHeart) }, (_, index) => {
            const remainingHealth = currentHealth - index * this.healthPerHeart;
            const fill: 0 | 0.5 | 1 = remainingHealth >= this.healthPerHeart ? 1 : remainingHealth > 0 ? 0.5 : 0;
            return { index, fill };
        });
    });
}
