import Link from 'next/link';

interface NavItemProps {
  title: string;
  href: string;
  isActive: boolean;
}

export default function NavItem({ title, href, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors hover:text-primary ${
        isActive ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {title}
    </Link>
  );
} 