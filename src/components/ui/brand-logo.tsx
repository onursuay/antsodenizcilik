import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export function BrandLogo({
  className,
  imageClassName = "h-auto w-full",
  priority = false,
}: BrandLogoProps) {
  return (
    <div className={className}>
      <Image
        src="/antso-logo.png"
        alt="Antso Denizcilik"
        width={600}
        height={307}
        priority={priority}
        className={imageClassName}
      />
    </div>
  );
}
