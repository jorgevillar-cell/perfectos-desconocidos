type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = "h-14 w-auto" }: BrandLogoProps) {
  return (
    <img
      src="/fondopd.jpg"
      alt="Perfectos Desconocidos"
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}
