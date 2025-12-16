export default function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // This layout removes the default sidebar for project pages
    // The project editor handles its own full-screen layout
    return <>{children}</>;
}
