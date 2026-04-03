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
        src="/antso-denizcilik-logo.png"
        alt="Antso Denizcilik"
        width={291}
        height={123}
        priority={priority}
        className={imageClassName}
      />
    </div>
  );
}
