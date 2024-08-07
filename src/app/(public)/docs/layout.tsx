import { DocLayout } from "@/components/mdx/docs";

const TableContent = [
  {
    title: "LibSQL Studio",
    href: "/docs",
  },
  {
    title: "Connecting",
    sub: [
      {
        title: "Connect to Turso",
        href: "/docs/connect-turso",
      },
      {
        title: "Connect to Valtown",
        href: "/docs/connect-valtown",
      },
    ],
  },
  {
    title: "Integration",
    sub: [
      {
        title: "Embed Client",
        href: "/docs/embed-iframe-client",
      },
      {
        title: "Temporary Session",
        href: "/docs/temporary-session",
      },
    ],
  },
];

export default function MdxLayout({ children }: { children: React.ReactNode }) {
  return (
    <DocLayout content={TableContent} title="Document">
      {children}
    </DocLayout>
  );
}
