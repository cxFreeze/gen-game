export interface ScheduledTask {
    readonly callback: () => void;
    remainingTime: number;
    startedAt: number;
    timeout: ReturnType<typeof setTimeout> | undefined;
}
