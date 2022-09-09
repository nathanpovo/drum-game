export function FormatTime(ms: number) {
    const t = ms > 0 ? Math.floor(ms / 1000) : 0;
    const d = Math.floor(t / 60);
    const s = Math.floor(t - d * 60)
    return `${d}:${s >= 10 ? s : "0" + s}`;
}

export function Clamp(n: number, min: number, max: number) { return Math.min(Math.max(n, min), max); }


export function ExpLerp(current: number, target: number, pow: number, dt: number, linearStep = 0) {
    if (current == target) return current;
    const blend = Math.pow(pow, dt); // 0.99 means we will move 1% percent towards target for each ms
    current = target * (1 - blend) + current * blend;

    if (linearStep > 0) {
        linearStep *= dt; // this gives us a very small linear movement, which helps stabilize
        const diff = target - current;
        if (Math.abs(diff) < linearStep)
            current = target;
        else
            current += Math.sign(diff) * linearStep;
    }

    return current;
}