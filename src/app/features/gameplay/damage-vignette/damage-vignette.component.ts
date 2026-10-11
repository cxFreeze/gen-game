import { Component, computed, effect, input, signal } from '@angular/core';
import { healthPerHeart } from '../health-display';

@Component({
    selector: 'gg-damage-vignette',
    template: '',
    styleUrl: './damage-vignette.component.scss',
    host: {
        'aria-hidden': 'true',
        '[style.opacity]': 'opacity()',
        '[class.is-taking-damage]': 'isTakingDamage()',
    },
})
export class DamageVignetteComponent {
    readonly current = input.required<number>();
    readonly max = input.required<number>();
    protected readonly isTakingDamage = signal(false);
    protected readonly opacity = computed(() => {
        if (this.max() <= 0) {
            return 0;
        }
        if (this.isTakingDamage()) {
            return 0.8;
        }
        return this.current() <= healthPerHeart ? 0.5 : 0;
    });
    private previousHealth: number | undefined;
    private previousMaxHealth = 0;

    constructor() {
        effect(onCleanup => {
            const currentHealth = this.current();
            const maxHealth = this.max();
            const hasTakenDamage = maxHealth > 0
                && maxHealth === this.previousMaxHealth
                && this.previousHealth !== undefined
                && currentHealth < this.previousHealth;
            this.previousHealth = currentHealth;
            this.previousMaxHealth = maxHealth;
            this.isTakingDamage.set(hasTakenDamage);
            if (hasTakenDamage) {
                // Consecutive hits extend the pulse; cleanup cancels obsolete timers.
                const timeout = setTimeout(() => this.isTakingDamage.set(false), 180);
                onCleanup(() => clearTimeout(timeout));
            }
        });
    }
}
