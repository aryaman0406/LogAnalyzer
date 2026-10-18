/** Static gradient fallback for reduced-motion or low-end devices. */
export function HeroFallback() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(ellipse at 40% 50%, hsl(234 89% 74% / 0.12) 0%, transparent 60%),
          radial-gradient(ellipse at 70% 30%, hsl(160 84% 55% / 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 30% 80%, hsl(0 84% 73% / 0.05) 0%, transparent 40%),
          hsl(220 20% 4%)
        `,
      }}
    />
  )
}
